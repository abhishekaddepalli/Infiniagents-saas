import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ok, route } from '@/lib/api'
import { requireUser } from '@/lib/auth'
import { createWorkspace, getWorkspaceContext, setActiveWorkspace } from '@/lib/workspace'

const schema = z.object({ workspaceName: z.string().trim().min(2).max(60).optional() })

/**
 * Completes onboarding.
 *
 * Also the safety net for an account that somehow has no workspace — an older
 * user row, or a registration interrupted midway — so nobody gets stuck in a
 * redirect loop between the dashboard and this screen.
 */
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser()
  const { workspaceName } = schema.parse(await request.json().catch(() => ({})))

  const context = await getWorkspaceContext()
  if (!context) {
    const workspace = await createWorkspace({
      userId: user.id,
      name: workspaceName || `${user.name.split(' ')[0]}'s Workspace`,
      isPersonal: true,
    })
    await setActiveWorkspace(user.id, workspace.id)
  } else if (workspaceName && workspaceName !== context.workspaceName) {
    await prisma.workspace.update({
      where: { id: context.workspaceId },
      data: { name: workspaceName },
    })
  }

  await prisma.user.update({ where: { id: user.id }, data: { onboardedAt: new Date() } })
  return ok({ done: true })
})
