import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { createSession, hashPassword } from '@/lib/auth'
import { createWorkspace } from '@/lib/workspace'
import { registerSchema } from '@/lib/validation'
import { clientIp, limit } from '@/lib/rate-limit'
import { getSettings } from '@/lib/settings'
import { randomToken, sha256 } from '@/lib/crypto'
import { brand, isEmailConfigured, sendEmail, verifyEmailTemplate, welcomeTemplate } from '@/lib/email'
import { recordAudit } from '@/lib/audit'
import { env } from '@/lib/env'

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000

export const POST = route(async (request: NextRequest) => {
  // 5 sign-ups per IP per 15 minutes.
  limit(`register:${clientIp(request)}`, 5, 15 * 60_000)

  const settings = await getSettings()
  if (settings.allowRegistration !== 'true') {
    throw new AppError('New registrations are currently disabled.', 403)
  }

  const { name, email, password } = registerSchema.parse(await request.json())

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) throw new AppError('An account with that email already exists.', 409)

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  })

  // Every account gets a personal workspace; everything they create lives in it.
  const workspace = await createWorkspace({
    userId: user.id,
    name: `${name.split(' ')[0]}'s Workspace`,
    isPersonal: true,
  })
  await prisma.user.update({ where: { id: user.id }, data: { lastWorkspaceId: workspace.id } })

  // Email verification. The account is usable immediately — verification is
  // encouraged, not enforced, so a broken mail setup cannot lock anyone out.
  const token = randomToken()
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      type: 'EMAIL_VERIFICATION',
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
    },
  })

  const branding = await brand()
  const verifyUrl = `${env.appUrl}/verify-email?token=${token}`
  await sendEmail({ to: email, ...verifyEmailTemplate(branding, name, verifyUrl) })
  await sendEmail({ to: email, ...welcomeTemplate(branding, name) })

  await createSession(user.id)
  await recordAudit({
    workspaceId: workspace.id,
    userId: user.id,
    action: 'user.registered',
    ip: clientIp(request),
  })

  return ok(
    {
      redirectTo: '/onboarding',
      // Without a mail provider the link is surfaced so the flow is testable.
      ...(isEmailConfigured() ? {} : { verifyUrl }),
    },
    201,
  )
})
