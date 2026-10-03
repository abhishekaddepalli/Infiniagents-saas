import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, route } from '@/lib/api'
import { randomToken, sha256 } from '@/lib/crypto'
import { forgotPasswordSchema } from '@/lib/validation'
import { clientIp, limit } from '@/lib/rate-limit'
import { brand, isEmailConfigured, resetPasswordTemplate, sendEmail } from '@/lib/email'
import { env } from '@/lib/env'

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

export const POST = route(async (request: NextRequest) => {
  limit(`forgot:${clientIp(request)}`, 5, 15 * 60_000)

  const { email } = forgotPasswordSchema.parse(await request.json())
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })

  // Always answer as if the address existed — never confirm which emails have
  // accounts. Only the body of a real email would differ.
  if (!user) return ok({ sent: true })

  const token = randomToken()
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      type: 'PASSWORD_RESET',
      // Only the hash is stored, so a database leak cannot be replayed.
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  })

  const resetUrl = `${env.appUrl}/reset-password?token=${token}`
  await sendEmail({ to: email, ...resetPasswordTemplate(await brand(), resetUrl) })

  // With no mail provider configured, the link is returned outside production
  // so the flow stays testable during setup.
  return ok(
    isEmailConfigured() || env.isProduction ? { sent: true } : { sent: true, resetUrl },
  )
})
