import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, route } from '@/lib/api'
import { requireUser } from '@/lib/auth'
import { createWorkspace, setActiveWorkspace } from '@/lib/workspace'
import { workspaceSchema } from '@/lib/validation'
import { recordAudit } from '@/lib/audit'

/** Every workspace the signed-in user belongs to. */
export const GET = route(async () => {
  const user = await requireUser()
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    include: {
      workspace: {
        select: {
          id: true, name: true, slug: true, image: true, isPersonal: true,
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return ok({
    workspaces: memberships.map((membership) => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      image: membership.workspace.image,
      isPersonal: membership.workspace.isPersonal,
      members: membership.workspace._count.members,
      role: membership.role,
    })),
  })
})

/** Create a new team workspace and switch into it. */
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser()
  const { name } = workspaceSchema.parse(await request.json())

  const workspace = await createWorkspace({ userId: user.id, name })
  await setActiveWorkspace(user.id, workspace.id)
  await recordAudit({
    workspaceId: workspace.id,
    userId: user.id,
    action: 'workspace.created',
    metadata: { name },
  })

  return ok({ workspace }, 201)
})
