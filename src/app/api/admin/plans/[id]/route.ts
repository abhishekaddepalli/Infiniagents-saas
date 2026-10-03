import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, route } from '@/lib/api'
import { requireAdmin } from '@/lib/auth'
import { planSchema } from '@/lib/validation'

type Context = { params: Promise<{ id: string }> }

export const PATCH = route(async (request: NextRequest, context: Context) => {
  await requireAdmin()
  const { id } = await context.params
  const data = planSchema.partial().parse(await request.json())
  const plan = await prisma.plan.update({ where: { id }, data })
  return ok({ plan })
})
