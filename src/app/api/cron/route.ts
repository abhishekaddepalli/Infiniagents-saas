import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { runAutomation } from '@/lib/automation/engine'
import { isDue } from '@/lib/automation/schedule'

/**
 * Scheduler entry point for SCHEDULE-triggered automations.
 *
 * Call it on an interval from Vercel Cron, system cron, GitHub Actions, or any
 * scheduler — see documentation/scheduling.md. It is safe to call more often
 * than your finest schedule: `isDue` uses each workflow's `lastRunAt`, so a
 * slot fires exactly once no matter how often this endpoint is hit.
 *
 * Protect it. Anyone who can reach this URL can spend your users' AI budget.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Cap per invocation so one call cannot run for minutes on serverless. */
const MAX_RUNS_PER_INVOCATION = 10

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  // Without a secret set, only allow this outside production — otherwise a
  // forgotten variable would silently leave the endpoint wide open.
  if (!secret) return process.env.NODE_ENV !== 'production'

  const header = request.headers.get('authorization')
  return header === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const scheduled = await prisma.automation.findMany({
    where: { triggerType: 'SCHEDULE', status: 'ACTIVE', schedule: { not: null } },
    select: { id: true, workspaceId: true, name: true, schedule: true, timezone: true, lastRunAt: true },
  })

  const due = scheduled.filter((automation) =>
    isDue({
      expression: automation.schedule,
      timezone: automation.timezone,
      lastRunAt: automation.lastRunAt,
    }),
  )

  const results: { id: string; name: string; status: string; error?: string }[] = []

  for (const automation of due.slice(0, MAX_RUNS_PER_INVOCATION)) {
    // Claim the slot before running, so a concurrent invocation skips it.
    await prisma.automation.update({
      where: { id: automation.id },
      data: { lastRunAt: new Date() },
    })

    try {
      const result = await runAutomation({
        automationId: automation.id,
        workspaceId: automation.workspaceId,
        userId: null,
        input: '',
        source: 'SCHEDULE',
      })
      results.push({ id: automation.id, name: automation.name, status: result.status })
    } catch (error) {
      // One failing workflow must not stop the rest of the batch.
      console.error(`[agentflow] scheduled run failed for ${automation.id}:`, error)
      results.push({
        id: automation.id,
        name: automation.name,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return Response.json({
    checked: scheduled.length,
    due: due.length,
    ran: results.length,
    results,
  })
}
