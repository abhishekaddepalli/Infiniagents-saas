export type ProviderId = 'OPENAI' | 'GEMINI' | 'ANTHROPIC'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type CompletionRequest = {
  model: string
  messages: ChatMessage[]
  temperature: number
  maxTokens: number
  apiKey: string
}

export type CompletionResult = {
  text: string
  inputTokens: number
  outputTokens: number
  /** True when the response came from the built-in simulator, not a real API. */
  simulated: boolean
}

/**
 * One piece of a streamed response.
 * `delta` events carry text as it arrives; the final `done` event carries the
 * token counts, which providers only report at the end of a stream.
 */
export type StreamChunk =
  | { type: 'delta'; text: string }
  | { type: 'done'; inputTokens: number; outputTokens: number }

/**
 * Every AI provider implements this interface.
 *
 * To add a provider (Mistral, Groq, Ollama, ...):
 *   1. Create `src/lib/ai/providers/<name>.ts` exporting an AIProvider.
 *   2. Register it in the `providers` map in `src/lib/ai/index.ts`.
 *   3. Add the matching value to the `Provider` enum in prisma/schema.prisma.
 *   4. Add its models under Admin -> AI Models.
 * No other file needs to change.
 */
export type AIProvider = {
  id: ProviderId
  label: string
  /** Where a buyer gets an API key — shown in Settings -> AI Providers. */
  consoleUrl: string
  keyPlaceholder: string
  complete(request: CompletionRequest): Promise<CompletionResult>
  /** Server-sent token stream, used by the playground and the public API. */
  stream(request: CompletionRequest): AsyncGenerator<StreamChunk>
  /** Cheapest possible call used by the "Test Connection" button. */
  verify(apiKey: string): Promise<void>
}

/**
 * Reads an SSE body line by line.
 *
 * All three providers stream Server-Sent Events, but chunk boundaries do not
 * line up with event boundaries — so buffering until a newline is required, or
 * events get split mid-JSON.
 */
export async function* readSseLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let newline: number
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline).trim()
        buffer = buffer.slice(newline + 1)
        if (line) yield line
      }
    }
    if (buffer.trim()) yield buffer.trim()
  } finally {
    reader.releaseLock()
  }
}

/** Providers report token counts differently; this is the shared fallback. */
export function estimateTokens(text: string): number {
  // ~4 characters per token is a good enough approximation for cost display.
  return Math.max(1, Math.ceil(text.length / 4))
}

export class ProviderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProviderError'
  }
}

/**
 * Turns an upstream HTTP failure into a message that is safe and useful to
 * show a user — never the raw provider payload.
 */
export function describeHttpFailure(providerLabel: string, status: number, body: string): string {
  if (status === 401 || status === 403) {
    return `${providerLabel} rejected the API key. Check your key under Settings → AI Providers.`
  }
  if (status === 429) {
    return `${providerLabel} is rate limiting this key. Wait a moment and try again.`
  }
  if (status === 404) {
    return `${providerLabel} does not recognise that model. Pick a different model for this agent.`
  }
  if (status >= 500) {
    return `${providerLabel} is temporarily unavailable. Please try again shortly.`
  }
  // Surface the provider's own short message when it is safe and brief.
  try {
    const parsed = JSON.parse(body)
    const detail = parsed?.error?.message || parsed?.message
    if (typeof detail === 'string' && detail.length < 200) {
      return `${providerLabel} could not complete the request: ${detail}`
    }
  } catch {
    /* fall through to the generic message */
  }
  return `Unable to contact ${providerLabel}. Check your API configuration and try again.`
}
