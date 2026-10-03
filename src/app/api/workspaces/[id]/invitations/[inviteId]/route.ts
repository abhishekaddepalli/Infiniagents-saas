import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireWorkspaceRole } from '@/lib/workspace'

type Context = { params: Promise<{ id: string; inviteId: string }> }

/** Revoke a pending invitation. */
export const DELETE = route(async (_request: NextRequest, context: Context) => {
  const { workspaceId } = await requireWorkspaceRole('ADMIN')
  const { inviteId } = await context.params

  const invitation = await prisma.workspaceInvitation.findFirst({
    where: { id: inviteId, workspaceId },
  })
  if (!invitation) throw new AppError('Invitation not found.', 404)

  await prisma.workspaceInvitation.delete({ where: { id: inviteId } })
  return ok({ revoked: true })
})
