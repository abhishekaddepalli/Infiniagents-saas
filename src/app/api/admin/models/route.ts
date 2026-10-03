import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { requireAdmin } from '@/lib/auth'
import { aiModelSchema } from '@/lib/validation'

export const POST = route(async (request: NextRequest) => {
  await requireAdmin()
  const data = aiModelSchema.parse(await request.json())

  const existing = await prisma.aiModel.findUnique({
    where: { provider_modelId: { provider: data.provider, modelId: data.modelId } },
  })
  if (existing) throw new AppError('That model is already in the catalog for this provider.', 409)

  const model = await prisma.aiModel.create({ data })
  return ok({ model }, 201)
})
