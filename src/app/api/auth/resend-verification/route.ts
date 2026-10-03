import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireUser } from '@/lib/auth'
import { randomToken, sha256 } from '@/lib/crypto'
import { brand, isEmailConfigured, sendEmail, verifyEmailTemplate } from '@/lib/email'
import { limit } from '@/lib/rate-limit'
import { env } from '@/lib/env'

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000

export const POST = route(async (_request: NextRequest) => {
  const user = await requireUser()
  limit(`resend-verify:${user.id}`, 3, 15 * 60_000)

  if (user.emailVerifiedAt) throw new AppError('Your email address is already confirmed.', 400)

  // Supersede any outstanding verification tokens for this account.
  await prisma.verificationToken.deleteMany({
    where: { userId: user.id, type: 'EMAIL_VERIFICATION', usedAt: null },
  })

  const token = randomToken()
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      type: 'EMAIL_VERIFICATION',
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
    },
  })

  const url = `${env.appUrl}/verify-email?token=${token}`
  const sent = await sendEmail({
    to: user.email,
    ...verifyEmailTemplate(await brand(), user.name, url),
  })

  return ok({ sent, ...(isEmailConfigured() ? {} : { verifyUrl: url }) })
})
