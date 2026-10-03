import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireUser } from '@/lib/auth'
import { profileSchema } from '@/lib/validation'

/** Update the signed-in user's name, email, and avatar. */
export const PATCH = route(async (request: NextRequest) => {
  const user = await requireUser()
  const { name, email, image } = profileSchema.parse(await request.json())

  if (email !== user.email) {
    const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (taken) throw new AppError('That email address is already in use.', 409)
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name, email, image: image || null },
    select: { id: true, name: true, email: true, image: true },
  })
  return ok({ user: updated })
})
