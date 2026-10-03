import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { runAutomation } from '@/lib/automation/engine'
import { clientIp, limit } from '@/lib/rate-limit'

type Context = { params: Promise<{ key: string }> }

/**
 * Public webhook trigger.
 *
 * POST /api/webhooks/<key> with { "input": "..." } — or any JSON body, which
 * is passed to the workflow as a string when no `input` field is present.
 * The key is the only credential, so treat it as a secret: anyone holding it
 * can run the workflow (and spend the owner's AI budget).
 */
export const POST = route(async (request: NextRequest, context: Context) => {
  const { key } = await context.params
  // Rate limited per key, since these endpoints are unauthenticated.
  limit(`webhook:${key}:${clientIp(request)}`, 30, 60_000)

  const automation = await prisma.automation.findUnique({
    where: { webhookKey: key },
    select: { id: true, workspaceId: true, status: true, triggerType: true },
  })

  // The same error for an unknown key and a disabled workflow, so the endpoint
  // cannot be used to probe which keys exist.
  if (!automation || automation.triggerType !== 'WEBHOOK') {
    throw new AppError('Webhook not found.', 404)
  }
  if (automation.status !== 'ACTIVE') {
    throw new AppError('This automation is not active.', 409)
  }

  const body = await request.json().catch(() => ({}))
  const input =
    typeof body?.input === 'string'
      ? body.input
      : typeof body === 'string'
        ? body
        : JSON.stringify(body)

  const result = await runAutomation({
    automationId: automation.id,
    workspaceId: automation.workspaceId,
    input: input.slice(0, 10000),
    source: 'WEBHOOK',
  })

  return ok({
    executionId: result.executionId,
    status: result.status,
    output: result.output,
    error: result.error,
    tokens: { input: result.inputTokens, output: result.outputTokens },
    durationMs: result.durationMs,
  })
})
