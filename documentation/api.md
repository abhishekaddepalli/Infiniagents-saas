# Public REST API

Let your own product — or your customers — drive agents and automations
programmatically.

Base URL: `https://your-domain.com/api/v1`

---

## Authentication

Every request carries an API key as a bearer token:

```
Authorization: Bearer af_live_xxxxxxxxxxxxxxxx
```

Create keys under **API Keys** in the app (workspace admins and owners only).
The full key is shown **once, at creation** — only a SHA-256 hash is stored, so
a lost key cannot be recovered. Revoke it and issue a new one.

A key is bound to one workspace and can only reach that workspace's data.

### Scopes

A key carries only the scopes you grant it:

| Scope | Allows |
|---|---|
| `agents:read` | List agents |
| `chat:write` | Send messages to an agent |
| `automations:read` | List automations |
| `automations:run` | Trigger a workflow |
| `executions:read` | Read run history |

A request without the required scope returns `403` naming the missing scope.

### Errors

| Status | Meaning |
|---|---|
| `401` | Missing, invalid, revoked or expired key |
| `403` | Key lacks the required scope |
| `404` | Not found, or not in this key's workspace |
| `402` | Plan limit reached |
| `422` | Invalid request body |
| `429` | Rate limited |

Errors are always `{ "error": "readable message" }`.

---

## Endpoints

### List agents

```http
GET /api/v1/agents
```

```json
{
  "data": [
    {
      "id": "clx8f2...",
      "name": "Customer Support Agent",
      "description": "Front-line support for billing and account questions.",
      "provider": "OPENAI",
      "model": "gpt-4o-mini",
      "temperature": 0.3,
      "maxTokens": 1024,
      "status": "ACTIVE",
      "createdAt": "2026-08-30T10:00:00.000Z"
    }
  ]
}
```

---

### Chat with an agent

```http
POST /api/v1/agents/:id/chat
Content-Type: application/json

{
  "message": "What is your refund policy?",
  "conversationId": null,
  "stream": false
}
```

Pass a `conversationId` from a previous response to continue a thread — the
agent's memory setting then applies.

```json
{
  "data": {
    "id": "clx9a1...",
    "conversationId": "clx9a0...",
    "role": "assistant",
    "content": "We offer a full refund within 14 days...",
    "usage": { "inputTokens": 237, "outputTokens": 133, "costUsd": 0.000115 },
    "sources": [{ "document": "Support Handbook.md", "score": 0.33 }],
    "simulated": false
  }
}
```

`sources` is populated when the agent has a knowledge base attached.
`simulated` is `true` when the reply came from Demo Mode rather than a provider.

#### Streaming

Set `"stream": true` to receive Server-Sent Events:

```
event: start
data: {"conversationId":"clx9a0..."}

event: delta
data: {"text":"We offer "}

event: delta
data: {"text":"a full refund "}

event: done
data: {"id":"clx9a1...","conversationId":"clx9a0...","usage":{"inputTokens":237,"outputTokens":133,"costUsd":0.000115}}
```

An `event: error` frame is sent if the provider fails mid-stream — the HTTP
status is already `200` by then, so errors have to travel as events.

```js
const response = await fetch(`${base}/api/v1/agents/${id}/chat`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hello', stream: true }),
})

const reader = response.body.getReader()
const decoder = new TextDecoder()
let buffer = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  buffer += decoder.decode(value, { stream: true })

  let boundary
  while ((boundary = buffer.indexOf('\n\n')) !== -1) {
    const frame = buffer.slice(0, boundary)
    buffer = buffer.slice(boundary + 2)
    const event = frame.match(/^event: (.+)$/m)?.[1]
    const data = JSON.parse(frame.match(/^data: (.+)$/m)?.[1] ?? '{}')
    if (event === 'delta') process.stdout.write(data.text)
  }
}
```

---

### List automations

```http
GET /api/v1/automations
```

---

### Run an automation

```http
POST /api/v1/automations/:id/run
Content-Type: application/json

{ "input": "Customer cannot log in" }
```

```json
{
  "data": {
    "executionId": "clxb2...",
    "status": "COMPLETED",
    "output": "Thanks for reaching out...",
    "steps": [
      { "label": "Ticket received", "type": "TRIGGER", "status": "completed", "ms": 1 },
      { "label": "Classify urgency", "type": "AI_AGENT", "status": "completed", "ms": 842 }
    ],
    "usage": { "inputTokens": 300, "outputTokens": 303, "costUsd": 0.000227 },
    "durationMs": 1231
  }
}
```

The request blocks until the workflow finishes. Long workflows should be moved
to a queue — see `documentation/automations.md`.

---

### List executions

```http
GET /api/v1/executions?limit=50&automationId=clx...
```

---

## Rate limits

| Endpoint group | Limit |
|---|---|
| Reads (`agents`, `automations`, `executions`) | 120 / minute / key |
| Chat | 60 / minute / key |
| Automation runs | 30 / minute / key |

Limits are per key **and** per client IP. Plan limits apply on top: an API
request that would exceed the workspace's monthly AI allowance returns `402`.

**The limiter is in-memory and per-process.** Behind a load balancer or on
serverless, each instance keeps its own counters. Swap `src/lib/rate-limit.ts`
for Redis before relying on these numbers — the `limit()` signature is designed
so nothing else changes.

---

## Adding an endpoint

1. Create `src/app/api/v1/<resource>/route.ts`.
2. Start with `const { workspaceId } = await requireApiKey(request, 'your:scope')`.
3. Filter every query by `workspaceId`.
4. Add the scope to `API_SCOPES` in `src/lib/validation.ts` and to the `SCOPES`
   list in `src/components/settings/api-keys-panel.tsx`.

Wrapping the handler in `route()` gives you the same safe error handling as the
rest of the application.
