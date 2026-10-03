import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireAdmin } from '@/lib/auth'

type Context = { params: Promise<{ id: string }> }

const schema = z.object({
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
})

export const PATCH = route(async (request: NextRequest, context: Context) => {
  const admin = await requireAdmin()
  const { id } = await context.params

  // Guard rail: an admin cannot lock themselves out of their own panel.
  if (id === admin.id) {
    throw new AppError('You cannot change your own role or status from here.', 400)
  }

  const data = schema.parse(await request.json())
  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, status: true },
  })
  return ok({ user })
})

export const DELETE = route(async (_request: NextRequest, context: Context) => {
  const admin = await requireAdmin()
  const { id } = await context.params

  if (id === admin.id) throw new AppError('You cannot delete your own account.', 400)

  // Cascades remove the user's agents, automations, executions and usage.
  await prisma.user.delete({ where: { id } })
  return ok({ deleted: true })
})
