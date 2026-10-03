import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireWorkspaceRole } from '@/lib/workspace'
import { workspaceSchema } from '@/lib/validation'
import { recordAudit } from '@/lib/audit'

type Context = { params: Promise<{ id: string }> }

export const PATCH = route(async (request: NextRequest, context: Context) => {
  const { workspaceId, user } = await requireWorkspaceRole('ADMIN')
  const { id } = await context.params
  // Only the active workspace may be edited, so an id from elsewhere is a 403.
  if (id !== workspaceId) throw new AppError('Switch to that workspace before editing it.', 403)

  const { name, image } = workspaceSchema.parse(await request.json())
  const workspace = await prisma.workspace.update({
    where: { id },
    data: { name, image: image || null },
  })

  await recordAudit({ workspaceId, userId: user.id, action: 'workspace.updated', metadata: { name } })
  return ok({ workspace })
})

export const DELETE = route(async (_request: NextRequest, context: Context) => {
  const { workspaceId, user } = await requireWorkspaceRole('OWNER')
  const { id } = await context.params
  if (id !== workspaceId) throw new AppError('Switch to that workspace before deleting it.', 403)

  const workspace = await prisma.workspace.findUnique({ where: { id } })
  if (!workspace) throw new AppError('Workspace not found.', 404)
  if (workspace.isPersonal) {
    throw new AppError('Your personal workspace cannot be deleted.', 400)
  }

  // Cascades remove the workspace's agents, automations, runs and usage.
  await prisma.workspace.delete({ where: { id } })
  await recordAudit({ userId: user.id, action: 'workspace.deleted', metadata: { name: workspace.name } })
  return ok({ deleted: true })
})
