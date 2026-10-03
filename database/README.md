# Database

The schema is defined and versioned in [`../prisma/schema.prisma`](../prisma/schema.prisma).
That file is the source of truth — everything in this folder is a convenience copy.

## Files

| File | What it is |
|---|---|
| `schema.sql` | The full schema as plain PostgreSQL DDL, generated from the Prisma schema |

## The normal way to set up the database

```bash
npm run setup     # prisma generate + migrate deploy + seed
```

Or step by step:

```bash
npm run db:deploy   # apply migrations
npm run db:seed     # load demo data
```

Migrations live in [`../prisma/migrations/`](../prisma/migrations/) and are what
you should use — they are versioned and repeatable.

## Using `schema.sql` directly

Only useful if you are inspecting the structure, importing it into a diagram
tool, or setting up a database outside Prisma:

```bash
createdb agentflow
psql agentflow -f database/schema.sql
```

This creates the tables but records no migration history, so a later
`prisma migrate deploy` will not know what has already been applied. Prefer the
migrations for anything you intend to keep.

To regenerate this file after a schema change:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > database/schema.sql
```

## Tables

> **Ownership.** Everything a customer creates belongs to a **workspace**, not
> directly to a user. `workspace_id` is the security filter every query must
> apply — see [documentation/teams.md](../documentation/teams.md).

| Table | Holds |
|---|---|
| `users` | Accounts, with `role` (USER/ADMIN) and `status` |
| `workspaces` | The ownership and billing unit |
| `workspace_members` | Who belongs to which workspace, and their role |
| `workspace_invitations` | Pending invitations, tokens stored hashed |
| `verification_tokens` | Password reset and email verification, hashed |
| `provider_keys` | Per-workspace AI provider keys, encrypted at rest |
| `api_keys` | Public API credentials, stored as a hash with scopes |
| `agents` | Agent configuration: prompt, model, temperature, limits |
| `knowledge_bases` | A retrieval corpus and its embedding model |
| `documents` | Uploaded files and their indexing status |
| `document_chunks` | Embedded slices used for retrieval |
| `conversations` / `messages` | Playground threads, with per-message tokens and cost |
| `automations` | Workflows: trigger type, webhook key, schedule, status |
| `automation_nodes` | Steps, with type, config JSON and canvas position |
| `automation_connections` | Edges, with an optional condition branch |
| `executions` | Run records: input, step trace, output, tokens, cost, duration |
| `ai_usage` | One row per AI request — everything on the Usage page aggregates from here |
| `ai_models` | Admin-managed model catalog and per-million-token prices |
| `agent_templates` | The ready-made agents in the template library |
| `prompts` | The reusable prompt library |
| `plans` / `subscriptions` | Plan definitions, limits, and who is on what |
| `invoices` | Billing history recorded from gateway webhooks |
| `webhook_events` | Processed gateway events, making webhooks idempotent |
| `audit_logs` | Append-only record of security and billing actions |
| `notifications` | Per-user in-app notifications |
| `settings` | Global key/value application and branding settings |

## Notes

- All money is stored as `double precision` in the currency you configure. There
  is no conversion anywhere — the currency symbol is a display label.
- Model prices are per **1,000,000 tokens**, matching how providers publish them.
- A limit of `-1` on a plan means unlimited.
- Deleting a workspace cascades to its agents, automations, executions, usage,
  knowledge bases and API keys.
- Sample records created by the seed carry `is_demo = true`.
- Embeddings are stored as `double precision[]`. For large corpora, migrate to
  pgvector — see [documentation/knowledge-base.md](../documentation/knowledge-base.md).
