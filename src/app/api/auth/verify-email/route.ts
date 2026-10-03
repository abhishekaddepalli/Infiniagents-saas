import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { sha256 } from '@/lib/crypto'
import { clientIp, limit } from '@/lib/rate-limit'

const schema = z.object({ token: z.string().min(10) })

export const POST = route(async (request: NextRequest) => {
  limit(`verify:${clientIp(request)}`, 20, 15 * 60_000)
  const { token } = schema.parse(await request.json())

  const record = await prisma.verificationToken.findUnique({
    where: { tokenHash: sha256(token) },
  })
  if (!record || record.type !== 'EMAIL_VERIFICATION' || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError('This confirmation link is invalid or has expired. Request a new one.', 400)
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ])

  return ok({ verified: true })
})
