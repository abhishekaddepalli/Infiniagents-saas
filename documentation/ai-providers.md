# AI providers

Every AI call in the application goes through one function, `runCompletion()` in
`src/lib/ai/index.ts`. Nothing else talks to a provider directly.

---

## How a request flows

```
Playground / Automation engine
        │
        ▼
runCompletion({ userId, provider, model, messages, temperature, maxTokens })
        │
        ├─ resolveApiKey(userId, provider)
        │     1. the user's own key (decrypted from provider_keys)
        │     2. the server key from .env
        │     3. nothing → Demo Mode simulator (if DEMO_MODE=true)
        │
        ├─ providers[provider].complete(...)   ← the only provider-specific code
        │
        └─ returns { text, inputTokens, outputTokens, latencyMs, simulated }
                 │
                 ▼
        calculateCost() reads the price from ai_models
                 │
                 ▼
        one row written to ai_usage
```

Because cost and usage recording live outside the provider, a new provider gets
all of it for free.

---

## The contract

```ts
export type AIProvider = {
  id: ProviderId
  label: string
  consoleUrl: string        // where a user gets a key
  keyPlaceholder: string    // shown in the settings input
  complete(request: CompletionRequest): Promise<CompletionResult>
  verify(apiKey: string): Promise<void>   // the "Test Connection" call
}
```

`CompletionResult` must report `inputTokens` and `outputTokens`. Use the values
the provider returns; fall back to `estimateTokens()` when it returns none.

---

## Adding a provider

Four small steps. Nothing outside them changes.

### 1. Write the provider

`src/lib/ai/providers/mistral.ts`:

```ts
import { AIProvider, ProviderError, describeHttpFailure, estimateTokens } from '../types'

const BASE_URL = 'https://api.mistral.ai/v1'

export const mistralProvider: AIProvider = {
  id: 'MISTRAL',
  label: 'Mistral',
  consoleUrl: 'https://console.mistral.ai/api-keys',
  keyPlaceholder: '...',

  async complete({ model, messages, temperature, maxTokens, apiKey }) {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
    })
    if (!response.ok) {
      throw new ProviderError(describeHttpFailure('Mistral', response.status, await response.text()))
    }
    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content ?? ''
    return {
      text,
      inputTokens: data?.usage?.prompt_tokens ?? estimateTokens(messages.map(m => m.content).join(' ')),
      outputTokens: data?.usage?.completion_tokens ?? estimateTokens(text),
      simulated: false,
    }
  },

  async verify(apiKey) {
    const response = await fetch(`${BASE_URL}/models`, { headers: { Authorization: `Bearer ${apiKey}` } })
    if (!response.ok) {
      throw new ProviderError(describeHttpFailure('Mistral', response.status, await response.text()))
    }
  },
}
```

Always throw `ProviderError` with a message from `describeHttpFailure()`. That
function turns HTTP statuses into something a user can act on ("Mistral rejected
the API key…") and never leaks the raw provider payload.

### 2. Register it

`src/lib/ai/index.ts`:

```ts
import { mistralProvider } from './providers/mistral'

export const providers: Record<ProviderId, AIProvider> = {
  OPENAI: openaiProvider,
  GEMINI: geminiProvider,
  ANTHROPIC: anthropicProvider,
  MISTRAL: mistralProvider,     // ← added
}
```

Add `MISTRAL` to `ProviderId` in `src/lib/ai/types.ts`, and to the
`providerEnum` in `src/lib/validation.ts`.

### 3. Add it to the schema

`prisma/schema.prisma`:

```prisma
enum Provider {
  OPENAI
  GEMINI
  ANTHROPIC
  MISTRAL
}
```

```bash
npm run db:migrate
```

### 4. Add its models

**Admin → AI Models → Add model**, with the provider, display name, exact model
ID, and prices per million tokens.

Also add the new provider to the three `<Select>` option lists that hardcode
provider names (agent editor, template manager, admin settings) — search for
`"GEMINI"` to find them.

---

## OpenAI-compatible gateways

Groq, Together, OpenRouter, DeepInfra, LM Studio, vLLM and Ollama's OpenAI shim
all speak the OpenAI Chat Completions format. No new provider is needed — point
the existing one at them:

```env
OPENAI_BASE_URL="https://api.groq.com/openai/v1"
```

Then add their model IDs in Admin → AI Models.

---

## Where keys live

| Location | Scope | Storage |
|---|---|---|
| Settings → AI Providers | One user | `provider_keys`, AES-256-GCM encrypted |
| `.env` | Whole server | Environment variable |

The user key wins when both exist.

Encryption uses `ENCRYPTION_KEY` (`src/lib/crypto.ts`). Keys are never sent to
the browser — the API returns only the masked hint (`sk-••••••••82a`) that was
computed at save time. **Rotating `ENCRYPTION_KEY` makes every stored key
unreadable**; the app treats that as "no key configured" and logs a warning,
and users simply re-enter theirs.

---

## Demo Mode

When no key is available and `DEMO_MODE=true`, `simulateCompletion()` in
`src/lib/ai/simulator.ts` answers instead. It matches the agent's system prompt
against a few personas (support, sales, content, SEO, email, research) and
returns a plausible, non-random response, with a short delay so loading states
behave normally.

Every simulated response is labelled in its own text and flagged with
`simulated: true`, which the playground surfaces as a Demo Mode badge. Token
counts are estimated from character length, so usage and cost tracking are
exercised realistically.

It exists so a buyer can evaluate the product before spending anything. Delete
the file and set `DEMO_MODE=false` when you ship.
