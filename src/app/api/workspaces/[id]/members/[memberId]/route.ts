import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireWorkspace, requireWorkspaceRole, hasAtLeast } from '@/lib/workspace'
import { memberRoleSchema } from '@/lib/validation'
import { recordAudit } from '@/lib/audit'

type Context = { params: Promise<{ id: string; memberId: string }> }

/** Change a member's role. Only admins and owners may do this. */
export const PATCH = route(async (request: NextRequest, context: Context) => {
  const { workspaceId, user, role: actorRole } = await requireWorkspaceRole('ADMIN')
  const { memberId } = await context.params
  const { role } = memberRoleSchema.parse(await request.json())

  const member = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
    include: { user: { select: { email: true } } },
  })
  if (!member) throw new AppError('Member not found.', 404)

  // An admin cannot promote anyone to owner, or change an owner's role —
  // otherwise an admin could take over the workspace.
  if (!hasAtLeast(actorRole, 'OWNER') && (role === 'OWNER' || member.role === 'OWNER')) {
    throw new AppError('Only the workspace owner can change owner access.', 403)
  }
  if (member.userId === user.id) {
    throw new AppError('You cannot change your own role.', 400)
  }

  const updated = await prisma.workspaceMember.update({ where: { id: memberId }, data: { role } })
  await recordAudit({
    workspaceId,
    userId: user.id,
    action: 'member.role_changed',
    targetType: 'member',
    targetId: memberId,
    metadata: { email: member.user.email, role },
  })
  return ok({ member: updated })
})

/** Remove a member, or leave the workspace yourself. */
export const DELETE = route(async (_request: NextRequest, context: Context) => {
  const { workspaceId, user, role: actorRole } = await requireWorkspace()
  const { memberId } = await context.params

  const member = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
    include: { user: { select: { email: true } } },
  })
  if (!member) throw new AppError('Member not found.', 404)

  const isSelf = member.userId === user.id
  // Anyone may remove themselves; removing someone else needs admin rights.
  if (!isSelf && !hasAtLeast(actorRole, 'ADMIN')) {
    throw new AppError('You do not have permission to remove members.', 403)
  }
  if (member.role === 'OWNER') {
    throw new AppError(
      'The workspace owner cannot be removed. Transfer ownership first, or delete the workspace.',
      400,
    )
  }

  await prisma.workspaceMember.delete({ where: { id: memberId } })
  await recordAudit({
    workspaceId,
    userId: user.id,
    action: 'member.removed',
    targetType: 'member',
    targetId: memberId,
    metadata: { email: member.user.email, self: isSelf },
  })
  return ok({ removed: true })
})
