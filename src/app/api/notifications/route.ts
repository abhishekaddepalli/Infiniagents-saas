import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, route } from '@/lib/api'
import { requireUser } from '@/lib/auth'

export const GET = route(async () => {
  const user = await requireUser()
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return ok({ notifications })
})

/** Marks everything read. */
export const PATCH = route(async (_request: NextRequest) => {
  const user = await requireUser()
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  })
  return ok({ read: true })
})
