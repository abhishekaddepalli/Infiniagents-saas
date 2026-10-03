import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireUser } from '@/lib/auth'
import { setActiveWorkspace } from '@/lib/workspace'
import { sha256 } from '@/lib/crypto'
import { recordAudit } from '@/lib/audit'

const schema = z.object({ token: z.string().min(10) })

/**
 * Accepts a workspace invitation.
 *
 * The signed-in account's email must match the invited address, so a leaked
 * link cannot be redeemed by whoever happens to find it.
 */
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser()
  const { token } = schema.parse(await request.json())

  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { tokenHash: sha256(token) },
    include: { workspace: { select: { id: true, name: true } } },
  })

  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    throw new AppError('This invitation is invalid or has expired. Ask for a new one.', 400)
  }
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new AppError(
      `This invitation was sent to ${invitation.email}. Sign in with that address to accept it.`,
      403,
    )
  }

  await prisma.$transaction([
    prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: user.id } },
      create: { workspaceId: invitation.workspaceId, userId: user.id, role: invitation.role },
      update: {},
    }),
    prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    }),
  ])

  await setActiveWorkspace(user.id, invitation.workspaceId)
  await recordAudit({
    workspaceId: invitation.workspaceId,
    userId: user.id,
    action: 'member.joined',
    metadata: { email: user.email },
  })

  return ok({ workspace: invitation.workspace })
})
