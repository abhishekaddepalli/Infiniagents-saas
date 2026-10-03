# Troubleshooting

## Setup

**`Missing required environment variable "DATABASE_URL"`**
Copy `.env.example` to `.env` and fill it in. The file must be at the project
root, and the dev server must be restarted after changes.

**`Can't reach database server at localhost:5432`**
PostgreSQL is not running or the URL is wrong.
```bash
pg_isready                       # is it up?
psql "$DATABASE_URL" -c 'select 1'   # can you connect with these credentials?
```
Special characters in the password must be URL-encoded (`@` → `%40`).

**`database "agentflow" does not exist`**
```bash
createdb agentflow
```

**Managed database connection refused**
Most require SSL. Append `?sslmode=require` to `DATABASE_URL`.

**`P3009: migrate found failed migrations`**
In development, start clean: `npm run db:reset`. In production, resolve the
specific migration with `npx prisma migrate resolve --applied <name>` after
fixing the cause.

**Seed says "Demo content already present"**
That is the idempotency guard. To reload the samples:
`npm run db:reset && npm run db:seed`.

---

## Build and types

**Type errors mentioning `@prisma/client`**
```bash
npm run db:generate
```
Run this after every schema change, and after a fresh `npm install`.

**Blank page or `Cannot read properties of undefined (reading 'call')`**
A stale build cache — most often from running `next build` while `next dev` was
using the same `.next` directory.
```bash
rm -rf .next && npm run dev
```

**`Functions cannot be passed directly to Client Components`**
A server component is passing a function as a prop. Pass serializable data
instead — this is why the charts take a `format` name rather than a formatter.

---

## Authentication

**Redirected to /login immediately after signing in**
`AUTH_SECRET` changed, or differs between instances. Every instance must share
the same value; changing it invalidates all existing sessions.

**Cookie not set behind a proxy**
In production the cookie is `secure`, so it requires HTTPS. Terminate TLS
properly and forward `X-Forwarded-Proto`.

**Password reset link does not arrive**
No email provider is bundled. The link is printed to the server console, and
returned in the response outside production. See
[customization.md](customization.md#9-email-password-reset).

**`This account has been disabled`**
Set the user back to Active in Admin → Users.

---

## AI providers

**Every response ends with "Demo Mode…"**
No API key is configured. Add one in Settings → AI Providers, or set
`OPENAI_API_KEY` in `.env`. Set `DEMO_MODE="false"` to make this an error rather
than a fallback.

**"OpenAI rejected the API key"**
The key is wrong, revoked, or the account has no credit. Verify it directly:
```bash
curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"
```

**"does not recognise that model"**
The model ID in Admin → AI Models does not match what the provider expects, or
your account lacks access to it. Model IDs must be exact.

**Test Connection fails but chat works (or vice versa)**
`verify()` calls the provider's models endpoint; `complete()` calls chat. Some
keys are scoped to one and not the other.

**Keys stopped working after a redeploy**
`ENCRYPTION_KEY` changed. Stored keys cannot be decrypted with a different key.
Restore the old value, or have users re-enter theirs.

---

## Automations

**"has no agent selected"**
An AI Agent node needs an agent. Open the node and pick one.

**"The agent … is disabled"**
Enable it in the agent editor, or select a different agent in the node.

**"requests to private or internal network addresses are not allowed"**
Working as intended — the HTTP node cannot reach localhost or private IPs. Use a
public URL, or a tunnel like ngrok when developing.

**Webhook returns 404**
The key is wrong, the automation's trigger is not set to Webhook, or the
automation is not Active. All three return the same 404 on purpose.

**A run stops early**
A condition branch with nothing connected ends the workflow. Connect both the
green and red ports, or accept that one path terminates.

---

## Usage and cost

**Costs all show $0.00**
The model is not in Admin → AI Models, or its prices are zero. Costs are looked
up by exact `provider` + `modelId`.

**Token counts look approximate in Demo Mode**
They are — the simulator estimates from character length. Real providers return
exact counts.

**Usage chart is empty**
The chart covers the last 14 or 30 days. Older seeded data falls outside it.

---

## Still stuck

1. Read the server console — the real error is logged there even when the
   browser shows a friendly message.
2. Inspect the data directly: `npx prisma studio`.
3. Confirm your versions: Node 18.18+, PostgreSQL 13+.
4. Try a clean slate: `rm -rf .next node_modules && npm install && npm run setup`.
