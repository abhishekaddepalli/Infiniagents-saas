import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { hashPassword } from '@/lib/auth'
import { sha256 } from '@/lib/crypto'
import { resetPasswordSchema } from '@/lib/validation'
import { clientIp, limit } from '@/lib/rate-limit'
import { recordAudit } from '@/lib/audit'

export const POST = route(async (request: NextRequest) => {
  limit(`reset:${clientIp(request)}`, 10, 15 * 60_000)

  const { token, password } = resetPasswordSchema.parse(await request.json())

  const record = await prisma.verificationToken.findUnique({ where: { tokenHash: sha256(token) } })
  if (!record || record.type !== 'PASSWORD_RESET' || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError('This reset link is invalid or has expired. Request a new one.', 400)
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Invalidate any other outstanding reset tokens for this account.
    prisma.verificationToken.deleteMany({
      where: { userId: record.userId, type: 'PASSWORD_RESET', usedAt: null, id: { not: record.id } },
    }),
  ])

  await recordAudit({ userId: record.userId, action: 'user.password_reset', ip: clientIp(request) })
  return ok({ reset: true })
})
