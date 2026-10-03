import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireWorkspaceRole } from '@/lib/workspace'
import { inviteSchema } from '@/lib/validation'
import { assertWithinLimit } from '@/lib/plans'
import { randomToken, sha256 } from '@/lib/crypto'
import { brand, invitationTemplate, isEmailConfigured, sendEmail } from '@/lib/email'
import { recordAudit } from '@/lib/audit'
import { env } from '@/lib/env'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export const POST = route(async (request: NextRequest) => {
  const { workspaceId, workspaceName, user } = await requireWorkspaceRole('ADMIN')
  await assertWithinLimit(workspaceId, 'members')

  const { email, role } = inviteSchema.parse(await request.json())

  // Already a member? Nothing to invite.
  const existingMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId, user: { email } },
  })
  if (existingMember) throw new AppError('That person is already a member of this workspace.', 409)

  const token = randomToken()
  await prisma.workspaceInvitation.upsert({
    where: { workspaceId_email: { workspaceId, email } },
    create: {
      workspaceId,
      email,
      role,
      tokenHash: sha256(token),
      invitedById: user.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
    // Re-inviting replaces the old token rather than stacking invitations.
    update: {
      role,
      tokenHash: sha256(token),
      invitedById: user.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      acceptedAt: null,
    },
  })

  const url = `${env.appUrl}/invitations/accept?token=${token}`
  const template = invitationTemplate(await brand(), {
    inviterName: user.name,
    workspaceName,
    url,
  })
  const sent = await sendEmail({ to: email, ...template })

  await recordAudit({
    workspaceId,
    userId: user.id,
    action: 'member.invited',
    metadata: { email, role },
  })

  // Without an email provider the link has to be handed over manually, so it
  // is returned to the inviter rather than silently lost.
  return ok({ invited: true, emailSent: sent, ...(isEmailConfigured() ? {} : { inviteUrl: url }) }, 201)
})
