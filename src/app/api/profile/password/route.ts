import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { hashPassword, requireUser, verifyPassword } from '@/lib/auth'
import { changePasswordSchema } from '@/lib/validation'
import { limit } from '@/lib/rate-limit'

export const POST = route(async (request: NextRequest) => {
  const user = await requireUser()
  limit(`password:${user.id}`, 5, 15 * 60_000)

  const { currentPassword, newPassword } = changePasswordSchema.parse(await request.json())

  const record = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true },
  })
  if (!(await verifyPassword(currentPassword, record.passwordHash))) {
    throw new AppError('Your current password is not correct.', 400)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  })
  return ok({ updated: true })
})
