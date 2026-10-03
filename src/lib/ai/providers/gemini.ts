import {
  AIProvider, ProviderError, describeHttpFailure, estimateTokens, readSseLines,
} from '../types'

const BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta'

/**
 * Google Gemini generateContent API.
 * Gemini uses `contents` with `parts`, and calls the assistant role "model".
 */
export const geminiProvider: AIProvider = {
  id: 'GEMINI',
  label: 'Google Gemini',
  consoleUrl: 'https://aistudio.google.com/app/apikey',
  keyPlaceholder: 'AIza...',

  async complete({ model, messages, temperature, maxTokens, apiKey }) {
    const system = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')

    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))

    const response = await fetch(`${BASE_URL}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents,
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
    })

    if (!response.ok) {
      throw new ProviderError(describeHttpFailure('Google Gemini', response.status, await response.text()))
    }

    const data = await response.json()
    const text: string = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((part: { text?: string }) => part.text ?? '')
      .join('')

    return {
      text,
      inputTokens:
        data?.usageMetadata?.promptTokenCount ?? estimateTokens(messages.map((m) => m.content).join(' ')),
      outputTokens: data?.usageMetadata?.candidatesTokenCount ?? estimateTokens(text),
      simulated: false,
    }
  },

  async *stream({ model, messages, temperature, maxTokens, apiKey }) {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))

    const response = await fetch(`${BASE_URL}/models/${model}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents,
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
    })

    if (!response.ok || !response.body) {
      throw new ProviderError(describeHttpFailure('Google Gemini', response.status, await response.text()))
    }

    let text = ''
    let inputTokens = 0
    let outputTokens = 0

    for await (const line of readSseLines(response.body)) {
      if (!line.startsWith('data:')) continue
      try {
        const parsed = JSON.parse(line.slice(5).trim())
        const delta: string = (parsed?.candidates?.[0]?.content?.parts ?? [])
          .map((part: { text?: string }) => part.text ?? '')
          .join('')
        if (delta) {
          text += delta
          yield { type: 'delta', text: delta }
        }
        if (parsed?.usageMetadata) {
          inputTokens = parsed.usageMetadata.promptTokenCount ?? inputTokens
          outputTokens = parsed.usageMetadata.candidatesTokenCount ?? outputTokens
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
    const response = await fetch(`${BASE_URL}/models`, { headers: { 'x-goog-api-key': apiKey } })
    if (!response.ok) {
      throw new ProviderError(describeHttpFailure('Google Gemini', response.status, await response.text()))
    }
  },
}
