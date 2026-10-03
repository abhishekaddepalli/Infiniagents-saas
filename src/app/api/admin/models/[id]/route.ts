import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, route } from '@/lib/api'
import { requireAdmin } from '@/lib/auth'
import { aiModelSchema } from '@/lib/validation'

type Context = { params: Promise<{ id: string }> }

export const PATCH = route(async (request: NextRequest, context: Context) => {
  await requireAdmin()
  const { id } = await context.params
  const data = aiModelSchema.partial().parse(await request.json())
  const model = await prisma.aiModel.update({ where: { id }, data })
  return ok({ model })
})

export const DELETE = route(async (_request: NextRequest, context: Context) => {
  await requireAdmin()
  const { id } = await context.params
  // Agents keep their stored model id; cost lookups simply return 0 without a
  // catalog row, so removing a model never breaks an existing agent.
  await prisma.aiModel.delete({ where: { id } })
  return ok({ deleted: true })
})
