import { prisma } from './db'
import { getSettings } from './settings'

/** Enabled models offered in every model picker (agent editor, templates). */
export async function getEnabledModels() {
  return prisma.aiModel.findMany({
    where: { enabled: true },
    orderBy: [{ provider: 'asc' }, { name: 'asc' }],
    select: {
      provider: true,
      name: true,
      modelId: true,
      maxTokens: true,
      inputCostPerM: true,
      outputCostPerM: true,
    },
  })
}

/**
 * The provider/model a new agent starts on: the admin default when it is still
 * enabled, otherwise the first available model.
 */
export async function getDefaultModel(models: Awaited<ReturnType<typeof getEnabledModels>>) {
  const settings = await getSettings()
  const preferred = models.find(
    (model) => model.provider === settings.defaultProvider && model.modelId === settings.defaultModel,
  )
  const fallback = preferred ?? models[0]
  return {
    provider: fallback?.provider ?? 'OPENAI',
    model: fallback?.modelId ?? '',
    maxTokens: Math.min(fallback?.maxTokens ?? 1024, 2048),
  }
}
