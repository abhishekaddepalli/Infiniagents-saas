import { Provider } from '@prisma/client'

/**
 * Default AI model catalog.
 *
 * Prices are USD per 1,000,000 tokens and are approximate starting values —
 * provider pricing changes often. Update them under Admin → AI Models, which
 * writes to the database; nothing here is hardcoded into the cost calculation.
 */
export type SeedModel = {
  provider: Provider
  name: string
  modelId: string
  inputCostPerM: number
  outputCostPerM: number
  maxTokens: number
  enabled: boolean
}

export const aiModels: SeedModel[] = [
  // --- OpenAI ---
  { provider: 'OPENAI', name: 'GPT-4o mini', modelId: 'gpt-4o-mini', inputCostPerM: 0.15, outputCostPerM: 0.6, maxTokens: 16384, enabled: true },
  { provider: 'OPENAI', name: 'GPT-4o', modelId: 'gpt-4o', inputCostPerM: 2.5, outputCostPerM: 10, maxTokens: 16384, enabled: true },
  { provider: 'OPENAI', name: 'GPT-4.1 mini', modelId: 'gpt-4.1-mini', inputCostPerM: 0.4, outputCostPerM: 1.6, maxTokens: 32768, enabled: true },
  { provider: 'OPENAI', name: 'GPT-4.1', modelId: 'gpt-4.1', inputCostPerM: 2, outputCostPerM: 8, maxTokens: 32768, enabled: true },

  // --- Google Gemini ---
  { provider: 'GEMINI', name: 'Gemini 2.0 Flash', modelId: 'gemini-2.0-flash', inputCostPerM: 0.1, outputCostPerM: 0.4, maxTokens: 8192, enabled: true },
  { provider: 'GEMINI', name: 'Gemini 2.5 Flash', modelId: 'gemini-2.5-flash', inputCostPerM: 0.3, outputCostPerM: 2.5, maxTokens: 65536, enabled: true },
  { provider: 'GEMINI', name: 'Gemini 2.5 Pro', modelId: 'gemini-2.5-pro', inputCostPerM: 1.25, outputCostPerM: 10, maxTokens: 65536, enabled: true },

  // --- Anthropic ---
  { provider: 'ANTHROPIC', name: 'Claude Haiku 4.5', modelId: 'claude-haiku-4-5-20251001', inputCostPerM: 1, outputCostPerM: 5, maxTokens: 64000, enabled: true },
  { provider: 'ANTHROPIC', name: 'Claude Sonnet 4.5', modelId: 'claude-sonnet-4-5', inputCostPerM: 3, outputCostPerM: 15, maxTokens: 64000, enabled: true },
  { provider: 'ANTHROPIC', name: 'Claude Opus 4.1', modelId: 'claude-opus-4-1', inputCostPerM: 15, outputCostPerM: 75, maxTokens: 32000, enabled: true },
]
