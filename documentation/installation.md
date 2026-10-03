# Installation guide

A first-time setup takes about five minutes.

## The short version

```bash
npm install
npm run first-run
npm run dev
```

`npm run first-run` creates your `.env`, generates the `AUTH_SECRET` and
`ENCRYPTION_KEY`, asks once for a database URL, applies the migrations and
loads the demo data. It works the same on Windows, macOS and Linux, and is safe
to run again — it never overwrites a value you have already set.

If it stops with an error it tells you which of the three things to check. The
rest of this guide walks the same ground step by step, for when you want to do
it by hand or something needs debugging.

---

## 1. Check your tooling

```bash
node -v    # must be 18.18 or newer
psql --version
```

If you do not have PostgreSQL locally, a free managed database from Neon,
Supabase or Railway works just as well — skip to step 3 and paste their
connection string.

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Create the database

```bash
createdb agentflow
```

Or from inside `psql`:

```sql
CREATE DATABASE agentflow;
```

---

## 4. Configure `.env`

```bash
cp .env.example .env
```

Open `.env` and set the three required values:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/agentflow?schema=public"
AUTH_SECRET="<paste output of: openssl rand -base64 32>"
ENCRYPTION_KEY="<paste a second, different output of the same command>"
```

Generate the secrets:

```bash
openssl rand -base64 32
openssl rand -base64 32
```

On Windows without OpenSSL:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Leave `DEMO_MODE="true"` for now — it lets you explore everything before adding
an API key.

---

## 5. Run the migration and seed

```bash
npm run setup
```

You should see:

```
✓ Application settings
✓ 4 plans
✓ 10 AI models
✓ 12 agent templates
✓ 16 library prompts
✓ Accounts: admin@agentflow.ai (admin), demo@agentflow.ai (demo)
✓ 7 demo agents
✓ 5 demo automations
✓ 27 demo executions with usage history
```

The seed is idempotent — running it twice will not duplicate anything.

---

## 6. Start the server

```bash
npm run dev
```

Open <http://localhost:3000>.

---

## 7. Take the tour

Sign in as `demo@agentflow.ai` / `Demo@12345`:

1. **Dashboard** — summary cards and the usage chart, populated by the seed.
2. **AI Agents** — seven sample agents; open one to see the editor.
3. **Playground** — pick an agent and send a message. In Demo Mode you get a
   simulated reply with real token counts and a calculated cost.
4. **Automations** — open *Support Ticket Triage* and press **Run**. Watch each
   node execute in the result panel.
5. **Execution History** — your run is there, with its full step trace.
6. **Templates** — click *Use Template* on any of the twelve.

Then sign out and sign in as `admin@agentflow.ai` / `Admin@12345` to see the
admin panel at `/admin`.

---

## 8. Add a real API key (optional)

Go to **Settings → AI Providers**, paste a key, and press **Test Connection**.
From that point on, that provider's agents make real API calls.

---

## Next steps

- [customization.md](customization.md) — make it yours
- [deployment.md](deployment.md) — put it online
- [troubleshooting.md](troubleshooting.md) — if something above did not work
