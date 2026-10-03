import { Provider } from '@prisma/client'
import { prisma } from './db'

/**
 * Cost calculation reads prices from the admin-managed `ai_models` table so a
 * buyer can update pricing without touching code (Admin → AI Models).
 * Prices are stored as USD per 1,000,000 tokens.
 */
export async function calculateCost(
  provider: Provider,
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): Promise<number> {
  const model = await prisma.aiModel.findUnique({
    where: { provider_modelId: { provider, modelId } },
    select: { inputCostPerM: true, outputCostPerM: true },
  })
  if (!model) return 0
  const cost =
    (inputTokens / 1_000_000) * model.inputCostPerM + (outputTokens / 1_000_000) * model.outputCostPerM
  // Round to 6 decimals — single calls are often fractions of a cent.
  return Math.round(cost * 1e6) / 1e6
}
