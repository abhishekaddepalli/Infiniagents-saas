import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireWorkspace } from '@/lib/workspace'

type Context = { params: Promise<{ id: string }> }

/** Members and pending invitations for the active workspace. */
export const GET = route(async (_request: Request, context: Context) => {
  const { workspaceId } = await requireWorkspace()
  const { id } = await context.params
  if (id !== workspaceId) throw new AppError('Switch to that workspace first.', 403)

  const [members, invitations] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.workspaceInvitation.findMany({
      where: { workspaceId, acceptedAt: null },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return ok({ members, invitations })
})
