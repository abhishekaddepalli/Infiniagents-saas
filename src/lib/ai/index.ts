import 'server-only'
import { Provider } from '@prisma/client'
import { prisma } from '../db'
import { decrypt } from '../crypto'
import { env } from '../env'
import { AppError } from '../api'
import { anthropicProvider } from './providers/anthropic'
import { geminiProvider } from './providers/gemini'
import { openaiProvider } from './providers/openai'
import { simulateCompletion, simulateStream } from './simulator'
import {
  AIProvider, ChatMessage, CompletionResult, ProviderError, ProviderId, StreamChunk,
} from './types'

/**
 * The provider registry. Add a new provider here and it becomes available
 * everywhere — agents, playground, automations, admin model management.
 */
export const providers: Record<ProviderId, AIProvider> = {
  OPENAI: openaiProvider,
  GEMINI: geminiProvider,
  ANTHROPIC: anthropicProvider,
}

export const providerList = Object.values(providers)

export function getProvider(id: ProviderId | Provider): AIProvider {
  const provider = providers[id as ProviderId]
  if (!provider) throw new AppError(`Unknown AI provider "${id}".`)
  return provider
}

/** Server-wide fallback keys from .env, used when a user has not saved one. */
function envKeyFor(id: ProviderId): string {
  if (id === 'OPENAI') return env.openaiKey
  if (id === 'GEMINI') return env.geminiKey
  return env.anthropicKey
}

/**
 * Resolves the API key for a request, preferring the user's own saved key and
 * falling back to the server key from `.env`.
 * Returns an empty string when nothing is configured.
 */
export async function resolveApiKey(workspaceId: string, id: ProviderId): Promise<string> {
  const record = await prisma.providerKey.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: id as Provider } },
  })
  if (record) {
    try {
      return decrypt(record.keyCipher)
    } catch {
      // Usually means ENCRYPTION_KEY was rotated; treat it as "not configured".
      console.error('[agentflow] could not decrypt stored key for provider', id)
    }
  }
  return envKeyFor(id)
}

export type RunOptions = {
  workspaceId: string
  provider: ProviderId
  model: string
  messages: ChatMessage[]
  temperature: number
  maxTokens: number
}

/**
 * Single entry point for every AI call in the application.
 * Falls back to the Demo Mode simulator when no key is configured, so the
 * template is usable out of the box.
 */
export async function runCompletion(options: RunOptions): Promise<CompletionResult & { latencyMs: number }> {
  const started = Date.now()
  const apiKey = await resolveApiKey(options.workspaceId, options.provider)

  if (!apiKey) {
    if (!env.demoMode) {
      throw new AppError(
        `No API key configured for ${getProvider(options.provider).label}. Add one under Settings → AI Providers.`,
        400,
      )
    }
    const result = await simulateCompletion(options.messages, options.model)
    return { ...result, latencyMs: Date.now() - started }
  }

  try {
    const result = await getProvider(options.provider).complete({
      apiKey,
      model: options.model,
      messages: options.messages,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    })
    return { ...result, latencyMs: Date.now() - started }
  } catch (error) {
    if (error instanceof ProviderError) throw new AppError(error.message, 502)
    console.error('[agentflow] provider call failed:', error)
    throw new AppError(
      'Unable to contact the AI provider. Check your API configuration and try again.',
      502,
    )
  }
}

export * from './types'

/**
 * Streaming counterpart of `runCompletion`.
 *
 * Yields `delta` chunks as text arrives and a final `done` chunk with token
 * counts. Falls back to the Demo Mode simulator on the same terms, so the
 * caller never needs to know which path produced the stream.
 */
export async function* runStream(
  options: RunOptions,
): AsyncGenerator<StreamChunk & { simulated?: boolean }> {
  const apiKey = await resolveApiKey(options.workspaceId, options.provider)

  if (!apiKey) {
    if (!env.demoMode) {
      throw new AppError(
        `No API key configured for ${getProvider(options.provider).label}. Add one under Settings → AI Providers.`,
        400,
      )
    }
    for await (const chunk of simulateStream(options.messages, options.model)) {
      yield { ...chunk, simulated: true }
    }
    return
  }

  try {
    const stream = getProvider(options.provider).stream({
      apiKey,
      model: options.model,
      messages: options.messages,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    })
    for await (const chunk of stream) {
      yield chunk
    }
  } catch (error) {
    if (error instanceof ProviderError) throw new AppError(error.message, 502)
    console.error('[agentflow] provider stream failed:', error)
    throw new AppError(
      'Unable to contact the AI provider. Check your API configuration and try again.',
      502,
    )
  }
}
