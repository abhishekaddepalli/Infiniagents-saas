# Automations

## The model

An automation is a directed graph. Nodes are steps, connections are edges, and a
single **text payload** flows from step to step. Each node receives the payload,
does something, and returns the payload for the next step.

That one design decision — a single text value rather than a typed object graph —
is what keeps the engine (`src/lib/automation/engine.ts`) short enough to read in
one sitting.

---

## Execution

1. Start at the `TRIGGER` node, or at the first node nothing points to.
2. Run the node; it returns a new payload and, for conditions, a branch.
3. Follow the matching outgoing edge.
4. Repeat, up to 50 steps (a guard against cycles in a hand-drawn graph).
5. Write the result, step trace, token totals and duration to `executions`.

If a node throws, the run is marked `FAILED`, the message is stored, and the
failing step appears in the trace. Everything before it is preserved.

---

## Node types

| Node | Config | Behaviour |
|---|---|---|
| **Trigger** | — | Passes the run input through |
| **Text Input** | `text` | Sets the payload; `{{input}}` inserts the incoming payload |
| **AI Agent** | `prompt`, `agentId` | Calls the agent; the reply becomes the payload |
| **Condition** | `operator`, `value` | Branches `true`/`false`; payload unchanged |
| **HTTP Request** | `method`, `url`, `body` | Calls an API; the response body becomes the payload |
| **Delay** | `seconds` | Waits (capped at 10s) |
| **Output** | — | Marks the result |

### Placeholders

`{{input}}` and `{{payload}}` are interchangeable and expand to whatever the
previous step produced. They work in the AI Agent prompt, the Text Input text,
and the HTTP Request URL and body.

### Condition operators

`contains`, `not_contains`, `equals`, `longer_than` (character count), `is_empty`.

A condition node has two output ports — green for a match, red for everything
else. Connect both, or the non-matching branch simply ends the run.

---

## Triggers

### Manual — working
Press **Run** in the builder. The workflow saves first, so the run always uses
what is on screen.

### Webhook — working
Every webhook automation gets a secret key and a public endpoint:

```
POST /api/webhooks/<key>
Content-Type: application/json

{ "input": "Customer cannot log in" }
```

Response:

```json
{
  "executionId": "clx8f2...",
  "status": "COMPLETED",
  "output": "Thanks for reaching out...",
  "tokens": { "input": 284, "output": 176 },
  "durationMs": 1840
}
```

If the body has no `input` field, the whole JSON body is passed as the payload.

The automation must be **Active**. Unknown keys and inactive workflows return the
same 404, so the endpoint cannot be used to discover valid keys. Requests are
rate limited per key and IP.

**The key is the only credential.** Anyone holding the URL can run the workflow
and spend the owner's AI budget — treat it like a password. To rotate one,
change `webhook_key` in the database.

### Schedule — you supply the runner
The cron expression is stored on the automation. See
[scheduling.md](scheduling.md) for how to run it.

---

## Adding a node type

1. Add the value to `enum NodeType` in `prisma/schema.prisma`, then
   `npm run db:migrate`.
2. Add an entry to `NODE_TYPES` in
   `src/components/automations/node-types.ts` — label, description, icon,
   accent, whether it has an input/output, whether it branches, default config.
3. Add a `case` to `runNode()` in `src/lib/automation/engine.ts`.
4. Add its editor fields to `src/components/automations/node-inspector.tsx`.

Nothing else needs to change — the canvas, the save path and the execution trace
are all generic.

---

## Safety

**SSRF protection.** The HTTP Request node resolves the target hostname and
refuses private, loopback, link-local and carrier-grade-NAT addresses, including
IPv4-mapped IPv6 and cloud metadata endpoints (`169.254.169.254`). Only `http:`
and `https:` are allowed, and redirects are rejected because a redirect can point
back at a private address. See `src/lib/automation/url-guard.ts`.

**Timeouts and caps.** HTTP requests time out at 10 seconds; responses are
truncated to 20,000 characters; delays are capped at 10 seconds; a run stops
after 50 steps.

**Plan limits.** Every AI Agent node checks the owner's monthly request
allowance before calling the provider.

**Ownership.** Saving a graph verifies that every referenced agent belongs to
the signed-in user, so an agent id cannot be borrowed from another account.

---

## Production considerations

Runs execute inside the request that triggered them, which is simple and correct
for workflows that finish in seconds. For long-running workflows you would move
execution to a background queue (BullMQ, Inngest, QStash, a worker process):
create the `executions` row, return its id immediately, and have the worker call
`runAutomation()` and update the row. The engine needs no changes — only the
caller does.
