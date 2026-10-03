import 'server-only'
import { Provider } from '@prisma/client'
import { AppError } from '../api'
import { env } from '../env'
import { resolveApiKey } from '../ai'
import { LOCAL_EMBEDDING_MODEL, localEmbed } from './local-embed'

/**
 * Text embeddings for the knowledge base.
 *
 * Three paths, in order:
 *   1. OpenAI or Gemini, when a key is available for that provider.
 *   2. The local lexical embedder below, when no key is configured and
 *      DEMO_MODE is on — so retrieval is demonstrable out of the box.
 *   3. A clear error, when neither applies.
 *
 * Anthropic has no embeddings endpoint; select OpenAI or Gemini for a
 * knowledge base even if your agents run on Claude.
 */

export { LOCAL_EMBEDDING_MODEL, localEmbed }

export type EmbeddingResult = {
  vectors: number[][]
  model: string
  /** True when produced locally rather than by a provider. */
  local: boolean
  tokens: number
}

/** Providers that can embed. Anthropic is deliberately absent. */
export const EMBEDDING_PROVIDERS: Provider[] = ['OPENAI', 'GEMINI']

export const DEFAULT_EMBEDDING_MODELS: Record<string, string> = {
  OPENAI: 'text-embedding-3-small',
  GEMINI: 'text-embedding-004',
}

// ---------------------------------------------------------------------------
// Provider embeddings
// ---------------------------------------------------------------------------

async function openaiEmbed(texts: string[], model: string, apiKey: string): Promise<number[][]> {
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  const response = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: texts }),
  })
  if (!response.ok) {
    console.error('[agentflow] OpenAI embeddings failed:', await response.text())
    throw new AppError('OpenAI could not generate embeddings. Check your API key and model.', 502)
  }
  const data = await response.json()
  // The API may return results out of order; sort by index before mapping.
  return (data.data as { index: number; embedding: number[] }[])
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.embedding)
}

async function geminiEmbed(texts: string[], model: string, apiKey: string): Promise<number[][]> {
  const baseUrl = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta'
  const response = await fetch(`${baseUrl}/models/${model}:batchEmbedContents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: `models/${model}`,
        content: { parts: [{ text }] },
      })),
    }),
  })
  if (!response.ok) {
    console.error('[agentflow] Gemini embeddings failed:', await response.text())
    throw new AppError('Google Gemini could not generate embeddings. Check your API key and model.', 502)
  }
  const data = await response.json()
  return (data.embeddings as { values: number[] }[]).map((entry) => entry.values)
}

/** Providers cap how many inputs one embeddings call may carry. */
const BATCH_SIZE = 64

/**
 * Embeds a batch of texts with the knowledge base's configured provider,
 * falling back to the local embedder when no key is configured.
 */
export async function embedTexts(options: {
  workspaceId: string
  provider: Provider
  model: string
  texts: string[]
}): Promise<EmbeddingResult> {
  const { workspaceId, provider, model, texts } = options
  if (texts.length === 0) return { vectors: [], model, local: false, tokens: 0 }

  const tokens = texts.reduce((sum, text) => sum + Math.ceil(text.length / 4), 0)

  if (!EMBEDDING_PROVIDERS.includes(provider)) {
    throw new AppError(
      'That provider does not offer embeddings. Choose OpenAI or Google Gemini for this knowledge base.',
      400,
    )
  }

  const apiKey = await resolveApiKey(workspaceId, provider as 'OPENAI' | 'GEMINI')

  if (!apiKey) {
    if (!env.demoMode) {
      throw new AppError(
        'No API key is configured for embeddings. Add one under Settings → AI Providers.',
        400,
      )
    }
    return {
      vectors: texts.map(localEmbed),
      model: LOCAL_EMBEDDING_MODEL,
      local: true,
      tokens,
    }
  }

  const vectors: number[][] = []
  for (let offset = 0; offset < texts.length; offset += BATCH_SIZE) {
    const batch = texts.slice(offset, offset + BATCH_SIZE)
    vectors.push(
      ...(provider === 'OPENAI'
        ? await openaiEmbed(batch, model, apiKey)
        : await geminiEmbed(batch, model, apiKey)),
    )
  }

  return { vectors, model, local: false, tokens }
}

/** Embeds a single query with the same model a base was indexed with. */
export async function embedQuery(options: {
  workspaceId: string
  provider: Provider
  model: string
  query: string
}): Promise<number[]> {
  // A base indexed locally must be queried locally, or the vectors are
  // incomparable and every result would be noise.
  if (options.model === LOCAL_EMBEDDING_MODEL) return localEmbed(options.query)

  const result = await embedTexts({
    workspaceId: options.workspaceId,
    provider: options.provider,
    model: options.model,
    texts: [options.query],
  })
  return result.vectors[0] ?? []
}
