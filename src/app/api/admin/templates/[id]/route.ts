import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, route } from '@/lib/api'
import { requireAdmin } from '@/lib/auth'
import { templateSchema } from '@/lib/validation'

type Context = { params: Promise<{ id: string }> }

export const PATCH = route(async (request: NextRequest, context: Context) => {
  await requireAdmin()
  const { id } = await context.params
  const data = templateSchema.partial().parse(await request.json())
  const template = await prisma.agentTemplate.update({ where: { id }, data })
  return ok({ template })
})

export const DELETE = route(async (_request: NextRequest, context: Context) => {
  await requireAdmin()
  const { id } = await context.params
  // Agents already created from this template are unaffected.
  await prisma.agentTemplate.delete({ where: { id } })
  return ok({ deleted: true })
})
