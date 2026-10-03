# Scheduled automations

The schedule trigger stores a cron expression on the automation and exposes a
run endpoint. It does not run a scheduler for you, because the right scheduler
depends entirely on where you host.

---

## What already exists

- `automations.trigger_type = 'SCHEDULE'` and `automations.schedule` (cron text)
- `runAutomation()` — the same engine manual and webhook runs use
- Executions recorded with `source = 'SCHEDULE'`

You need one thing: something that fires on a schedule and calls the engine.

---

## Step 1 — add a runner endpoint

`src/app/api/cron/route.ts`:

```ts
import { prisma } from '@/lib/db'
import { runAutomation } from '@/lib/automation/engine'

export async function GET(request: Request) {
  // Anyone who can reach this URL can spend your users' AI budget.
  const secret = request.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const due = await prisma.automation.findMany({
    where: { triggerType: 'SCHEDULE', status: 'ACTIVE' },
    select: { id: true, userId: true, schedule: true },
  })

  const results = []
  for (const automation of due) {
    // Check the cron expression against "now" before running — see step 2.
    if (!isDue(automation.schedule)) continue
    try {
      const result = await runAutomation({
        automationId: automation.id,
        userId: automation.userId,
        input: '',
        source: 'SCHEDULE',
      })
      results.push({ id: automation.id, status: result.status })
    } catch (error) {
      console.error('[cron] automation failed', automation.id, error)
    }
  }

  return Response.json({ ran: results.length, results })
}
```

Add `CRON_SECRET` to `.env`.

## Step 2 — evaluate the cron expression

Install a parser:

```bash
npm install cron-parser
```

```ts
import parser from 'cron-parser'

/** True when the expression's previous fire time falls inside the last window. */
function isDue(expression: string | null, windowMs = 60_000) {
  if (!expression) return false
  try {
    const previous = parser.parseExpression(expression).prev().getTime()
    return Date.now() - previous < windowMs
  } catch {
    return false // an invalid expression never fires
  }
}
```

Match `windowMs` to how often your scheduler calls the endpoint. If it runs every
five minutes, use `5 * 60_000`.

For exactness, store `lastRunAt` on the automation and skip anything already run
for the current slot — that also protects you from a scheduler firing twice.

---

## Step 3 — schedule the call

### Vercel Cron

`vercel.json`:

```json
{ "crons": [{ "path": "/api/cron", "schedule": "*/5 * * * *" }] }
```

Vercel sends its own authorization header — check `CRON_SECRET` against it, or
verify the `x-vercel-signature` header instead. Note that Hobby plans limit cron
frequency.

### System cron (VPS)

```cron
*/5 * * * * curl -sS -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron
```

### GitHub Actions

```yaml
on:
  schedule:
    - cron: '*/5 * * * *'
jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - run: curl -sS -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" https://yourdomain.com/api/cron
```

### Managed schedulers

Upstash QStash, Inngest, and Trigger.dev all handle scheduling, retries and
observability, and are worth it once you have more than a handful of workflows.

---

## Things to get right

- **Protect the endpoint.** It runs workflows and spends money.
- **Cap concurrency.** Running hundreds of workflows in one request will time
  out on serverless. Batch them, or push each onto a queue.
- **Respect plan limits.** The engine already checks the owner's monthly
  allowance on every AI Agent node.
- **Time zones.** Cron expressions here are evaluated in the server's timezone.
  If users pick schedules, store their timezone and convert.
- **Watch for failures.** A scheduled workflow that fails silently every night
  is worse than one that never ran. Alert on repeated `FAILED` executions.
