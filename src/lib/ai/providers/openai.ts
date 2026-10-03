import {
  AIProvider, ProviderError, describeHttpFailure, estimateTokens, readSseLines,
} from '../types'

const BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'

/**
 * OpenAI Chat Completions.
 * Any OpenAI-compatible gateway (Groq, Together, OpenRouter, LM Studio, vLLM)
 * works by pointing OPENAI_BASE_URL at it — no code changes needed.
 */
export const openaiProvider: AIProvider = {
  id: 'OPENAI',
  label: 'OpenAI',
  consoleUrl: 'https://platform.openai.com/api-keys',
  keyPlaceholder: 'sk-...',

  async complete({ model, messages, temperature, maxTokens, apiKey }) {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature, max_completion_tokens: maxTokens }),
    })

    if (!response.ok) {
      throw new ProviderError(describeHttpFailure('OpenAI', response.status, await response.text()))
    }

    const data = await response.json()
    const text: string = data?.choices?.[0]?.message?.content ?? ''
    return {
      text,
      inputTokens: data?.usage?.prompt_tokens ?? estimateTokens(messages.map((m) => m.content).join(' ')),
      outputTokens: data?.usage?.completion_tokens ?? estimateTokens(text),
      simulated: false,
    }
  },

  async *stream({ model, messages, temperature, maxTokens, apiKey }) {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_completion_tokens: maxTokens,
        stream: true,
        // Ask for usage on the final chunk; without this it is never reported.
        stream_options: { include_usage: true },
      }),
    })

    if (!response.ok || !response.body) {
      throw new ProviderError(describeHttpFailure('OpenAI', response.status, await response.text()))
    }

    let text = ''
    let inputTokens = 0
    let outputTokens = 0

    for await (const line of readSseLines(response.body)) {
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') break

      try {
        const parsed = JSON.parse(payload)
        const delta: string = parsed?.choices?.[0]?.delta?.content ?? ''
        if (delta) {
          text += delta
          yield { type: 'delta', text: delta }
        }
        if (parsed?.usage) {
          inputTokens = parsed.usage.prompt_tokens ?? inputTokens
          outputTokens = parsed.usage.completion_tokens ?? outputTokens
        }
      } catch {
        // A malformed chunk should not kill an otherwise good stream.
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
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!response.ok) {
      throw new ProviderError(describeHttpFailure('OpenAI', response.status, await response.text()))
    }
  },
}
