import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireAdmin } from '@/lib/auth'
import { templateSchema } from '@/lib/validation'
import { slugify } from '@/lib/utils'

export const POST = route(async (request: NextRequest) => {
  await requireAdmin()
  const data = templateSchema.parse(await request.json())

  const slug = slugify(data.name)
  if (await prisma.agentTemplate.findUnique({ where: { slug } })) {
    throw new AppError('A template with that name already exists.', 409)
  }

  const template = await prisma.agentTemplate.create({ data: { ...data, slug } })
  return ok({ template }, 201)
})
