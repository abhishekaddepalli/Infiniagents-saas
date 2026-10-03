# 🚀 Infiniagents SaaS

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

**Infiniagents SaaS** is a full-featured, production-ready AI Agents & Workflow Automation SaaS platform. Build intelligent, autonomous AI assistants, equip them with custom Knowledge Bases (RAG), orchestrate them into visual multi-step workflows, and track every token, latency millisecond, and dollar spent.

> **💡 Zero-Config Demo Mode Out of the Box:** Runs without requiring any external AI provider keys! The built-in AI simulator and lexical embedding engine allow you to explore the entire application—agents, visual workflow canvas, playground, and usage metering—instantly. Plug in real OpenAI, Gemini, or Anthropic API keys whenever you are ready.

---

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Step-by-Step Installation Guide](#️-step-by-step-installation-guide)
- [Environment configuration](#environment-configuration)
- [Database setup](#database-setup)
- [Admin credentials](#admin-credentials)
- [AI provider configuration](#ai-provider-configuration)
- [Project structure](#project-structure)
- [Customization](#customization)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [What is and isn't included](#what-is-and-isnt-included)
- [Documentation](#documentation)

---

## Features

### AI agents
Create agents with their own system instructions, provider, model, temperature,
token budget and welcome message. Duplicate, enable/disable, delete, and test any
agent in the playground. Optional conversation memory, and an optional knowledge
base to answer from.

### Playground
A streaming chat interface: tokens appear as they arrive, with a stop button and
saved conversation history. The side panel shows input tokens, output tokens,
estimated cost and response time for every reply, and replies cite the knowledge
base passages they used.

### Knowledge bases (RAG)
Upload txt, markdown, csv, json, html or PDF — or paste text directly. Documents
are chunked on heading boundaries, embedded with OpenAI or Gemini, and retrieved
by similarity when an attached agent answers. A built-in keyword embedder means
retrieval works with no API key at all, and a retrieval tester shows exactly what
an agent would be handed for any question.

### Teams
Everything belongs to a workspace, not a user. Owner, admin and member roles;
email invitations with hashed, expiring tokens; per-plan seat limits; and a
workspace switcher. Every query filters on workspace, so one team can never
reach another's data.

### Public REST API
Scoped API keys let your own product call agents and automations. Keys are shown
once and stored only as a hash. Streaming is supported over Server-Sent Events.

### Automations
A visual canvas for chaining agents and actions into workflows. Ten node types:

| Node | What it does |
|---|---|
| Trigger | Where the workflow starts |
| Text Input | Sets or reshapes the text passed on |
| AI Agent | Sends the payload to one of your agents |
| Knowledge Search | Looks up matching content in a knowledge base |
| Condition | Branches on what the previous step returned |
| Transform | Extracts JSON, matches a pattern, truncates, re-templates |
| HTTP Request | Calls an external API |
| Send Email | Emails the current result |
| Delay | Pauses before continuing |
| Output | The workflow result |

Drag nodes, connect them, edit each one in the inspector, then run the workflow
and watch every step execute.

### Triggers
- **Manual** — run it yourself from the builder.
- **Webhook** — each workflow gets its own secret endpoint.
- **Schedule** — cron expressions with timezone support, run by `/api/cron`.
  Point any scheduler at it; see [`documentation/scheduling.md`](documentation/scheduling.md).

### Multiple AI providers
OpenAI, Google Gemini and Anthropic ship built in, behind a single provider
interface. Adding another provider is one new file plus one line in a registry —
see [`documentation/ai-providers.md`](documentation/ai-providers.md).

### Template & prompt libraries
12 ready-made agent templates across support, sales, content, SEO, research and
business, each with a full production-quality system prompt. One click creates
the agent in your workspace. Plus 16 reusable prompts with search and filtering.

### Onboarding, notifications and audit log
A three-step first-run flow, in-app notifications, and an append-only audit log
recording who created, invited, revoked and changed what.

### Usage & cost tracking
Every AI request is recorded with its token counts. Costs are calculated from
per-model prices stored in the database and editable from the admin panel —
nothing is hardcoded, because provider pricing changes.

### Execution history
Every run is stored with its input, per-node step trace, output, errors, token
usage, cost and duration.

### Plans & billing
Four configurable plans with limits on agents, automations, monthly requests,
team seats and knowledge documents, enforced on every request. Stripe and
Razorpay are fully implemented — checkout, signed webhooks with replay
protection, subscription lifecycle, hosted billing portal and invoice history.
Subscriptions are written only from a verified webhook, never from the browser.

### Admin panel
Platform stats, user management (disable, promote, delete), all agents, all
executions, AI model catalog with pricing, template management, plan management,
and global branding settings.

### Design
Dark, light and system themes across every screen. Responsive from phone to
desktop. Skeleton loading states, empty states, toasts, dialogs and tooltips
throughout. Icons from [lucide-react](https://lucide.dev) (ISC licence — free for
commercial use and redistribution).

---

## Package contents

```
/                  The application source (Next.js project root)
  prisma/          Database schema, migrations and seed
  src/             App routes, components and libraries
/database          Plain SQL reference schema and a table guide
/documentation     Thirteen setup, customization and integration guides
/screenshots       16 reference captures, plus a guide for taking your own
README.md
CHANGELOG.md
LICENSE.txt        Licence terms and a third-party dependency audit
.env.example
```

The application lives at the repository root rather than in a `source-code/`
subfolder, so `npm install && npm run dev` works immediately after unzipping,
with no path juggling.

---

## Requirements

- **Node.js** 18.18 or newer (20+ recommended)
- **PostgreSQL** 13 or newer
- **npm**, pnpm, or yarn

No AI provider account is required to run the template.

---

---

## 🛠️ Step-by-Step Installation Guide

Follow these steps to get **Infiniagents SaaS** up and running on your local machine or server.

### 📋 Prerequisites

Before you start, make sure you have:
- **Node.js**: `v18.18.0` or newer (`v20+` LTS recommended) -> [Download Node.js](https://nodejs.org/)
- **PostgreSQL**: `v14` or newer (Local installation or free cloud database on [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app))
- **Package Manager**: `npm`, `pnpm`, or `yarn`
- **Git**: Installed and configured on your machine

---

### ⚡ Option A: Quick Interactive Setup (Recommended)

Our built-in interactive wizard sets up your environment variables, generates cryptographic secrets, runs database migrations, and loads initial demo data automatically.

#### 1. Clone the repository
```bash
git clone https://github.com/abhishekaddepalli/Infiniagents-saas.git
cd Infiniagents-saas
```

#### 2. Install dependencies
```bash
npm install
```

#### 3. Run the interactive setup wizard
```bash
npm run first-run
```
> 💡 *The wizard prompts you for your `DATABASE_URL`, generates secure values for `AUTH_SECRET` and `ENCRYPTION_KEY`, applies Prisma database migrations, and seeds initial templates and demo accounts.*

#### 4. Start the development server
```bash
npm run dev
```

Visit **<http://localhost:3000>** in your browser!

---

### 🔧 Option B: Manual Step-by-Step Setup

If you prefer full control over your environment setup:

#### Step 1: Clone the Repository
```bash
git clone https://github.com/abhishekaddepalli/Infiniagents-saas.git
cd Infiniagents-saas
```

#### Step 2: Install Node Dependencies
```bash
npm install
```

#### Step 3: Configure Environment Variables
Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
```

Open `.env` in your editor and configure the 3 mandatory variables:
```env
# 1. PostgreSQL connection string (adjust username, password, host, port, database)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/infiniagents?schema=public"

# 2. Secret for signing JWT authentication session cookies (32 random bytes)
AUTH_SECRET="your-generated-auth-secret-string"

# 3. Secret for AES-256-GCM encryption of stored AI provider API keys
ENCRYPTION_KEY="your-generated-encryption-key-string"

# 4. Public URL of your application
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# 5. Demo Mode enabled by default (runs without AI provider keys)
DEMO_MODE="true"
```

> **🔑 How to generate secure secrets:**
> Run in your terminal:
> ```bash
> openssl rand -base64 32
> ```
> Run it twice—once for `AUTH_SECRET` and once for `ENCRYPTION_KEY`.

#### Step 4: Setup PostgreSQL Database
If you have PostgreSQL installed locally via CLI:
```bash
createdb infiniagents
```
*(Or use Docker to launch a quick PostgreSQL instance):*
```bash
docker run --name infiniagents-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=infiniagents -p 5432:5432 -d postgres:16-alpine
```

#### Step 5: Run Database Migrations & Seed Data
Execute the setup script to generate the Prisma client, deploy all schema tables, and populate seed models:
```bash
npm run setup
```
*(Or run each command individually):*
```bash
npm run db:generate   # Generates Prisma Client TypeScript types
npm run db:deploy     # Applies SQL migrations to your database
npm run db:seed       # Populates sample AI models, agent templates & accounts
```

#### Step 6: Launch Infiniagents SaaS
```bash
npm run dev
```
Navigate to **<http://localhost:3000>**.

---

### 🔑 Default Seed Login Credentials

Once seeded, you can immediately log in with any of the pre-configured accounts:

| Account Type | Email | Password | Access Level |
|---|---|---|---|
| **Platform Administrator** | `admin@agentflow.ai` | `Admin@12345` | Global Admin Panel (`/admin`), Model Pricing, Plans, System Settings |
| **Workspace Owner (Demo)** | `demo@agentflow.ai` | `Demo@12345` | Acme AI Team Workspace, Pre-built Agents, RAG Knowledge Base, Automations |
| **Workspace Member (Teammate)** | `sam@agentflow.ai` | `Demo@12345` | Workspace Member view, Playground, Shared Automations |

> ⚠️ **Important:** Remember to change administrator credentials in production via `.env` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`) or from the user Profile page.

---

## Environment configuration

Copy `.env.example` to `.env` and fill it in. **Never commit `.env`.**

| Variable | Required | What it does |
|---|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `AUTH_SECRET` | **Yes** | Signs the session cookie |
| `ENCRYPTION_KEY` | **Yes** | Encrypts stored AI provider keys (AES-256-GCM) |
| `NEXT_PUBLIC_APP_URL` | Yes | Your public URL; used to build webhook URLs |
| `DEMO_MODE` | No | `true` (default) simulates AI responses when no key is set |
| `OPENAI_API_KEY` | No | Server-wide fallback key |
| `GEMINI_API_KEY` | No | Server-wide fallback key |
| `ANTHROPIC_API_KEY` | No | Server-wide fallback key |
| `EMAIL_PROVIDER` | No | `console` (default), `smtp`, `resend` or `sendgrid` |
| `EMAIL_FROM` | No | Sender address for all outgoing mail |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | No | Enables Stripe checkout |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | No | Enables Razorpay |
| `CRON_SECRET` | No | Protects `/api/cron`; **set this in production** |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | No | Admin account created by the seed |
| `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` | No | Demo account created by the seed |

Generate the two secrets:

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -base64 32   # ENCRYPTION_KEY
```

> **Do not change `ENCRYPTION_KEY` after users have saved provider keys** — the
> stored keys become unreadable and everyone has to re-enter them.

---

## Database setup

Create a database, then point `DATABASE_URL` at it:

```bash
createdb agentflow
```

```env
DATABASE_URL="postgresql://user:password@localhost:5432/agentflow?schema=public"
```

Then run `npm run setup`.

Managed PostgreSQL (Neon, Supabase, Railway, RDS) works the same way — paste the
connection string they give you. Most managed providers require `?sslmode=require`
appended to the URL.

The schema is defined in [`prisma/schema.prisma`](prisma/schema.prisma) and a
plain SQL reference copy is in [`database/`](database/).

---

## Admin credentials

The seed creates three accounts:

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@agentflow.ai` | `Admin@12345` |
| Demo user (workspace owner) | `demo@agentflow.ai` | `Demo@12345` |
| Teammate (workspace admin) | `sam@agentflow.ai` | `Demo@12345` |

The demo account owns the **Acme AI Team** workspace, which holds all the sample
agents, automations, knowledge base and history. Sign in as the teammate to see
the same workspace from a second member's point of view.

The admin account has its own empty workspace and can reach the admin panel at
`/admin` — useful for confirming that workspaces really are isolated.

**Change both before deploying.** Either set `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` in `.env` before seeding, or change the password from the
profile page after signing in.

To promote an existing user to administrator, open **Admin → Users** and choose
*Make administrator*, or run:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
```

---

## AI provider configuration

There are two places a key can live, checked in this order:

1. **Per user** — *Settings → AI Providers* in the app. Encrypted in the
   database, never returned to the browser, shown only as `sk-••••••••82a`.
2. **Server-wide** — `OPENAI_API_KEY` / `GEMINI_API_KEY` / `ANTHROPIC_API_KEY`
   in `.env`, used for any user who has not saved their own.

If neither is set and `DEMO_MODE=true`, requests are answered by the built-in
simulator and every response is clearly labelled as simulated. Set
`DEMO_MODE=false` to make missing keys a hard error instead.

Where to get keys:

- OpenAI — <https://platform.openai.com/api-keys>
- Google Gemini — <https://aistudio.google.com/app/apikey>
- Anthropic — <https://console.anthropic.com/settings/keys>

Use **Test Connection** in the settings screen to verify a key works.

Any OpenAI-compatible gateway (Groq, Together, OpenRouter, LM Studio, vLLM)
works by setting `OPENAI_BASE_URL` — no code changes.

---

## Project structure

```
prisma/
  schema.prisma          Database schema
  seed.ts                Demo data seed
  seed-data/             Templates, models, plans, prompts
src/
  app/
    (marketing)/         Landing page, terms, privacy
    (auth)/              Login, register, password reset, email verify,
                         invitation accept
    (app)/               Dashboard, agents, playground, automations,
                         knowledge, templates, prompts, executions, usage,
                         team, api-keys, audit, notifications, onboarding,
                         profile, settings, billing
    (admin)/             Admin panel
    api/                 Route handlers
      v1/                Public REST API (API-key authenticated)
      webhooks/          Automation, Stripe and Razorpay webhooks
      cron/              Scheduled automation runner
  components/
    ui/                  Buttons, inputs, dialogs, tables, toasts…
    charts/              Hand-built SVG charts (no chart library)
    agents/ automations/ playground/ knowledge/ admin/ …
  lib/
    ai/                  Provider abstraction + simulator + streaming
    knowledge/           Chunking, embeddings, retrieval, ingestion
    billing/             Stripe and Razorpay gateways
    email/               Transports and templates
    automation/          Execution engine, SSRF guard, cron evaluation
    workspace.ts         The workspace security boundary
    auth.ts db.ts crypto.ts plans.ts pricing.ts audit.ts api-keys.ts …
documentation/           Guides (start here for anything specific)
database/                Plain SQL reference schema
```

---

## Customization

Everything below is covered in detail in
[`documentation/customization.md`](documentation/customization.md).

| To change | Where |
|---|---|
| App name, logo, favicon, footer, currency, links | **Admin → Settings** (no code) |
| Colours / theme | `--brand-*` variables in `src/app/globals.css` |
| Landing page | `src/app/(marketing)/page.tsx` |
| AI models and prices | **Admin → AI Models** (no code) |
| Plans, limits, features | **Admin → Plans** (no code) |
| Agent templates | **Admin → Templates**, or `prisma/seed-data/templates.ts` |
| Prompt library | `prisma/seed-data/prompts.ts` |
| Add an AI provider | `src/lib/ai/providers/` + registry — one file |
| Add an email transport | `src/lib/email/providers/` + registry — one file |
| Add a payment gateway | `src/lib/billing/` + registry — one file |
| Add an automation node type | `src/components/automations/node-types.ts` + engine |
| Add an API endpoint | `src/app/api/v1/` — see documentation/api.md |
| Turn teams off | Three edits — see documentation/teams.md |
| Admin account | `SEED_ADMIN_*` in `.env`, or Admin → Users |

---

## Deployment

Full guide: [`documentation/deployment.md`](documentation/deployment.md).

The short version:

1. Provision a PostgreSQL database.
2. Set every required environment variable, with a **new** `AUTH_SECRET` and
   `ENCRYPTION_KEY` for production.
3. Set `NEXT_PUBLIC_APP_URL` to your real domain (webhook URLs use it).
4. Run `npx prisma migrate deploy`.
5. Seed only if you want the demo data: `npm run db:seed`.
6. Build and start: `npm run build && npm run start`.

Before going live: change the seeded passwords, set `DEMO_MODE=false` once real
keys are configured, set `EMAIL_PROVIDER` so password resets actually send, set
`CRON_SECRET` and point a scheduler at `/api/cron`, replace the Terms and
Privacy placeholders, and add your gateway keys and plan price IDs if you intend
to charge.

---

## Troubleshooting

Full guide: [`documentation/troubleshooting.md`](documentation/troubleshooting.md).

| Symptom | Fix |
|---|---|
| `Missing required environment variable` | Copy `.env.example` to `.env` and fill it in |
| `Can't reach database server` | Check PostgreSQL is running and `DATABASE_URL` is correct |
| Responses end with "Demo Mode" | No API key configured — add one in Settings → AI Providers |
| "rejected the API key" | The key is wrong, revoked, or out of credit |
| Costs all show as $0.00 | The model isn't in **Admin → AI Models**, or its price is 0 |
| Blank page after `git pull` | `rm -rf .next && npm run dev` |
| Prisma type errors | `npm run db:generate` |

---

## What is and isn't included

Being straight about this matters more than a longer feature list.

### Fully implemented

Authentication, email verification and password reset; workspaces, roles and
invitations; agent CRUD; the streaming AI playground with conversation history;
all three provider integrations plus Demo Mode; knowledge bases with chunking,
embeddings and retrieval; the automation builder, execution engine, and manual,
webhook and scheduled triggers; token and cost tracking; execution history; the
public REST API with scoped keys; Stripe and Razorpay checkout, webhooks and
subscription lifecycle; plan limit enforcement; the admin panel; branding
configuration; audit log; dark mode; responsive layout.

### Needs your accounts, not your code

These are complete in the codebase and switch on when you supply credentials:

- **Payments.** Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (or the
  Razorpay equivalents) and add per-plan price IDs in Admin → Plans. Until then
  paid plans are not purchasable, and the billing page says so on screen.
- **Email.** Set `EMAIL_PROVIDER` to `smtp`, `resend` or `sendgrid`. Until then
  messages are printed to the server log, and reset/invitation links are shown
  in the UI so the flows stay usable during setup.
- **Scheduled automations.** The runner at `/api/cron` works; you point a
  scheduler at it (Vercel Cron, system cron, GitHub Actions).

### Genuinely not included

- **A vector database.** Similarity is computed in application code so the
  template installs on stock PostgreSQL. Past roughly 50,000 chunks you want
  pgvector — [the migration is documented](documentation/knowledge-base.md).
- **A job queue.** Automations and document ingestion run inline, which is fine
  at the sizes this template accepts and keeps the code readable.
- **Distributed rate limiting.** The limiter is in-memory and per-process; swap
  it for Redis before running multiple instances.
- **Two-factor authentication.**

**Placeholders to replace:** the Terms and Privacy pages, and the seeded demo
content once you no longer need it.

---

## Documentation

| Guide | Covers |
|---|---|
| [installation.md](documentation/installation.md) | Step-by-step first-time setup |
| [customization.md](documentation/customization.md) | Branding, colours, content, models, plans |
| [ai-providers.md](documentation/ai-providers.md) | How the abstraction works; adding a provider |
| [knowledge-base.md](documentation/knowledge-base.md) | RAG: chunking, embeddings, retrieval, pgvector |
| [teams.md](documentation/teams.md) | Workspaces, roles, invitations, the security boundary |
| [api.md](documentation/api.md) | The public REST API, keys and scopes |
| [email.md](documentation/email.md) | Transports, templates, deliverability |
| [automations.md](documentation/automations.md) | The engine, node types, webhooks |
| [payments.md](documentation/payments.md) | Stripe and Razorpay integration |
| [scheduling.md](documentation/scheduling.md) | Running scheduled automations |
| [deployment.md](documentation/deployment.md) | Vercel, Docker, VPS, and a launch checklist |
| [security.md](documentation/security.md) | What is implemented and what you still owe |
| [troubleshooting.md](documentation/troubleshooting.md) | Common problems and fixes |

---

## Licence

See [LICENSE.txt](LICENSE.txt). Third-party dependencies keep their own licences —
notably lucide-react (ISC), Next.js and React (MIT), Prisma (Apache 2.0) and
Tailwind CSS (MIT), all of which permit commercial use and redistribution.
