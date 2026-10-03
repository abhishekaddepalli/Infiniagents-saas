# Security

What this template implements, and what remains your responsibility.

---

## Implemented

### Passwords
Hashed with bcrypt at cost factor 12. Plain passwords are never stored or
logged. Minimum length 8, maximum 72 (bcrypt's own limit).

### Sessions
A signed JWT (HS256, `jose`) in an httpOnly, SameSite=Lax cookie, `secure` in
production, expiring after 7 days. Not readable from JavaScript, so an XSS bug
cannot exfiltrate the session.

### Authorization
Every protected page and API route calls `requireUser()` or `requireAdmin()`
independently. The middleware only checks that a cookie exists — it runs on the
Edge runtime where the database is unreachable, so it is a redirect convenience,
not the security boundary.

Every query that touches user-owned data filters by `userId` as well as `id`, so
a valid id from another account returns 404 rather than someone else's data.
Disabled accounts are treated exactly like signed-out visitors.

### API key encryption
Provider keys are encrypted with AES-256-GCM before being written to the
database and are never returned to the browser — the API exposes only the masked
hint computed at save time. All AI calls happen server-side.

### Password reset
Tokens are 32 random bytes, stored only as a SHA-256 hash, single-use, and
expire after one hour. Using one invalidates every other outstanding token for
that account. The forgot-password endpoint answers identically for known and
unknown addresses, so it cannot enumerate accounts.

### Input validation
Every API route validates its body with a Zod schema before touching the
database. Prisma parameterises all queries, so SQL injection is not reachable
through the ORM.

### XSS
React escapes interpolated values. Model output is rendered by a small formatter
(`src/components/playground/message-content.tsx`) that builds React text nodes —
it never uses `dangerouslySetInnerHTML`, so a prompt-injected `<script>` in a
model response is displayed as text.

The one deliberate `dangerouslySetInnerHTML` is the theme script in the root
layout, whose content is a compile-time constant with no interpolation.

### SSRF
The HTTP Request node resolves the target host and rejects private, loopback,
link-local, CGNAT and IPv4-mapped-IPv6 addresses, plus cloud metadata endpoints.
Only http/https, and redirects are refused because a redirect can point back at
a private address. See `src/lib/automation/url-guard.ts`.

### Rate limiting
Fixed-window, in-memory, applied to sign-in, registration, password reset, chat,
automation runs, webhooks and provider tests. See the caveat below.

### Error handling
`handleError()` maps thrown values to safe messages. Raw errors and stack traces
go to the server log; users see readable text. Provider failures are translated
into actionable messages that never echo the provider's raw payload.

### Security headers
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy` and HSTS are set in `next.config.mjs`.

---

## Your responsibility

### Rate limiting across instances
`src/lib/rate-limit.ts` is per-process. Behind a load balancer or on serverless,
each instance keeps its own counters, so the effective limit is higher than
configured. Replace the `Map` with Redis or Upstash for real enforcement — the
`limit()` signature is designed so nothing else changes.

### Content Security Policy
Not set, because a useful CSP depends on what you add. Once your third-party
scripts are known, add one in `next.config.mjs`.

### CSRF
Session cookies use `SameSite=Lax`, which blocks cross-site form posts. All
state-changing routes are `POST`/`PATCH`/`DELETE` with JSON bodies, which
browsers will not send cross-origin without CORS approval. If you add
cookie-authenticated form submissions or relax SameSite, add CSRF tokens.

### Webhook keys
A webhook key is a bearer credential in a URL. Anyone with it can run the
workflow and spend the owner's AI budget. Consider adding signature verification
if you expose these widely, and give users a way to rotate them.

### Prompt injection
Users configure their own agents, so a system prompt is not a trust boundary
against its own author. It *is* one when an agent processes untrusted input —
a support ticket, a fetched web page. Treat model output as untrusted data: it
is rendered as text here, but if you add HTML rendering, tool calls, or
automatic actions on model output, re-examine that.

### Multi-tenancy
Isolation is enforced by `userId` filters in application code, not by database
row-level security. Any new query you write must apply the same filter.

### Also worth doing
- Two-factor authentication
- Audit logging for admin actions
- Email verification on sign-up
- Account lockout after repeated failures
- Automated dependency scanning (`npm audit`, Dependabot)
- Database encryption at rest and tested backups
