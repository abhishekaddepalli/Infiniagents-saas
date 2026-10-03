# Changelog

All notable changes to this template are documented here.
This project follows [Semantic Versioning](https://semver.org/).

## [2.0.0]

A major expansion. The schema roughly doubles (17 → 28 models), and several
things that were previously "architecture provided" are now implemented.

### Breaking

- **Ownership moved from users to workspaces.** Every resource now carries a
  `workspaceId` rather than a `userId`. Existing installations need a data
  migration; new installations are unaffected.
- Migrations were squashed into a single `init`, since nothing was deployed.

### Teams
- Workspaces with owner, admin and member roles
- Email invitations with hashed, expiring tokens, verified against the
  invitee's own account email
- Workspace switcher, per-plan seat limits, and an audit log

### Knowledge bases (RAG)
- Upload txt, markdown, csv, json, html and PDF, or paste text
- Heading-aware chunking with overlap
- OpenAI and Gemini embeddings, plus a local keyword embedder so retrieval
  works with no API key
- Retrieval tester, and source citations on every agent reply
- Knowledge Search automation node

### Streaming
- Token streaming for all three providers and the simulator
- Server-Sent Events in the playground, with a stop button
- Saved conversation history

### Payments
- Stripe and Razorpay fully implemented against their REST APIs
- Timing-safe signature verification, replay protection and idempotent
  webhook handling
- Hosted billing portal, invoice history, and plan downgrade on cancellation
- Subscriptions written only from verified webhooks

### Public REST API
- `/api/v1` with scoped API keys, stored as hashes and shown once
- Agents, chat (streaming or not), automations, runs and executions
- Per-key rate limits

### Email
- Four transports: console, SMTP, Resend and SendGrid
- Verification, password reset, welcome and invitation templates
- Send Email automation node

### Also
- Working scheduled automations via `/api/cron`, with timezone support
- Transform automation node
- Three-step onboarding, in-app notifications
- Admin workspace view; plan editor gains seat, document and gateway fields

### Fixed
- Chunker packed documents into oversized multi-topic chunks, so retrieval
  returned the wrong section
- Cross-workspace automation runs returned 500 instead of 404
- Plans had no seat or document limits, so invitations were always rejected
- Message renderer did not handle italics

---

## [1.0.0]

First release.

### Core
- Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- PostgreSQL with Prisma, full schema and migrations
- Email/password authentication with sessions, logout, and password reset
- Role-based access control with a separate admin panel

### AI
- Provider abstraction with OpenAI, Google Gemini and Anthropic built in
- Demo Mode simulator so the template runs with no API key
- Per-user provider keys, encrypted at rest with AES-256-GCM
- Test Connection for each provider
- Admin-managed model catalog with per-model pricing

### Agents
- Create, edit, duplicate, enable/disable and delete agents
- System prompt, temperature, max tokens, welcome message, conversation memory
- Search and filter by status and provider
- Playground with per-reply token, cost and latency readout

### Automations
- Visual canvas builder with drag, connect, branch and inspect
- Seven node types: Trigger, Text Input, AI Agent, Condition, HTTP Request,
  Delay, Output
- Execution engine with per-node step tracing
- Manual and webhook triggers; schedule architecture with setup guide
- SSRF protection on outbound HTTP nodes

### Content
- 12 agent templates with production-quality system prompts
- 16 reusable library prompts with search and filtering
- Demo data: 7 agents, 5 workflows, and a month of execution history

### Analytics
- Usage tracking for requests, input/output tokens and estimated cost
- Daily charts, per-agent ranking and per-model cost breakdown
- Execution history with full run detail

### Plans
- Four configurable plans with agent, automation and request limits
- Limits enforced on every request
- Pricing page and plan-management UI
- Payment gateway architecture documented (Stripe and Razorpay)

### Admin
- Platform statistics and recent activity
- User management: disable, promote, delete
- Model, template and plan management
- Global branding and application settings

### Design
- Light, dark and system themes throughout
- Responsive from mobile to desktop
- Skeleton loaders, empty states, toasts, dialogs and tooltips
- Hand-built SVG charts, chosen to stay legible in both themes and for
  colour-blind readers

### Security
- bcrypt password hashing, httpOnly signed session cookies
- Zod validation on every API route
- Rate limiting on authentication, chat, runs and webhooks
- Security headers, safe error handling, no raw errors shown to users
