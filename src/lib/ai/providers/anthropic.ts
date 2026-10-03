import {
  AIProvider, ProviderError, describeHttpFailure, estimateTokens, readSseLines,
} from '../types'

const BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1'
const API_VERSION = '2023-06-01'

/**
 * Anthropic Messages API.
 * Note the two differences from OpenAI's shape, handled below:
 *   - the system prompt is a top-level `system` field, not a message
 *   - `max_tokens` is required
 */
export const anthropicProvider: AIProvider = {
  id: 'ANTHROPIC',
  label: 'Anthropic',
  consoleUrl: 'https://console.anthropic.com/settings/keys',
  keyPlaceholder: 'sk-ant-...',

  async complete({ model, messages, temperature, maxTokens, apiKey }) {
    const system = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')
    const turns = messages.filter((m) => m.role !== 'system')

    const response = await fetch(`${BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        ...(system ? { system } : {}),
        messages: turns.map((m) => ({ role: m.role, content: m.content })),
      }),
    })

    if (!response.ok) {
      throw new ProviderError(describeHttpFailure('Anthropic', response.status, await response.text()))
    }

    const data = await response.json()
    const text: string = (data?.content ?? [])
      .filter((block: { type: string }) => block.type === 'text')
      .map((block: { text: string }) => block.text)
      .join('')

    return {
      text,
      inputTokens: data?.usage?.input_tokens ?? estimateTokens(messages.map((m) => m.content).join(' ')),
      outputTokens: data?.usage?.output_tokens ?? estimateTokens(text),
      simulated: false,
    }
  },

  async *stream({ model, messages, temperature, maxTokens, apiKey }) {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
    const turns = messages.filter((m) => m.role !== 'system')

    const response = await fetch(`${BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        stream: true,
        ...(system ? { system } : {}),
        messages: turns.map((m) => ({ role: m.role, content: m.content })),
      }),
    })

    if (!response.ok || !response.body) {
      throw new ProviderError(describeHttpFailure('Anthropic', response.status, await response.text()))
    }

    let text = ''
    let inputTokens = 0
    let outputTokens = 0

    for await (const line of readSseLines(response.body)) {
      if (!line.startsWith('data:')) continue
      try {
        const parsed = JSON.parse(line.slice(5).trim())

        if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
          const delta: string = parsed.delta.text ?? ''
          if (delta) {
            text += delta
            yield { type: 'delta', text: delta }
          }
        }
        // Input tokens arrive on message_start, output on message_delta.
        if (parsed.type === 'message_start') {
          inputTokens = parsed.message?.usage?.input_tokens ?? inputTokens
        }
        if (parsed.type === 'message_delta') {
          outputTokens = parsed.usage?.output_tokens ?? outputTokens
        }
      } catch {
        // Ignore a malformed chunk rather than dropping the whole stream.
      }
    }

    yield {
      type: 'done',
      inputTokens: inputTokens || estimateTokens(messages.map((m) => m.content).join(' ')),
      outputTokens: outputTokens || estimateTokens(text),
    }
  },

  async verify(apiKey) {
    const response = await fetch(`${BASE_URL}/models`, {
      headers: { 'x-api-key': apiKey, 'anthropic-version': API_VERSION },
    })
    if (!response.ok) {
      throw new ProviderError(describeHttpFailure('Anthropic', response.status, await response.text()))
    }
  },
}
