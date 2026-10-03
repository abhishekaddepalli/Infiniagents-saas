# Customization guide

Everything a buyer normally needs to change, in the order you will want to
change it.

---

## 1. Application name, logo and branding

**No code required.** Sign in as an administrator and open **Admin → Settings**:

| Field | Effect |
|---|---|
| Application name | Sidebar, landing page, auth screens, browser title |
| Tagline | Landing page, auth screen |
| Logo URL | Replaces the default mark everywhere |
| Favicon URL | Browser tab icon |
| Footer text | Landing page and auth footers |
| Support email | Footer and legal pages |
| Website / Terms / Privacy URLs | Footer links |
| Currency code and symbol | Every price and cost figure |
| Default provider and model | What a new agent starts on |
| Allow registrations | Turns public sign-up on or off |

These are stored in the `settings` table. Defaults for a fresh install live in
`src/lib/settings-defaults.ts`.

To ship your own defaults instead of the AgentFlow ones, edit that file and
re-seed a clean database.

---

## 2. Colours

All colour comes from CSS variables in `src/app/globals.css`. Change the
`--brand-*` scale and the entire product re-skins — landing page, dashboard and
admin panel together.

```css
:root {
  /* Values are "R G B" with no commas, so Tailwind can apply opacity. */
  --brand-50:  240 249 255;
  --brand-500:  14 165 233;   /* primary buttons, links, active nav */
  --brand-600:   2 132 199;   /* button hover, emphasis */
  --brand-900:  12  74 110;
  /* …fill in the rest of the scale */
}
```

Surface colours (`--bg`, `--surface`, `--elevated`, `--line`, `--ink`,
`--muted`) are defined for light mode on `:root` and overridden for dark mode
under `.dark` in the same file. **Set both**, or dark mode will look wrong.

The chart palette (`--viz-1`, `--viz-2`, `--viz-3`) is defined separately, with
distinct steps for light and dark. Those three hues were chosen to stay
distinguishable for colour-blind readers and to hold contrast against both
surfaces — if you replace them, check the same two things.

A quick way to generate a full scale: pick your brand colour on
[uicolors.app](https://uicolors.app) and paste the 50–900 steps in as RGB triples.

---

## 3. Landing page

`src/app/(marketing)/page.tsx` is one file containing every section in order:
hero, features, API integration, use cases, pricing, FAQ, call to action, footer.

- **Feature cards** — the `features` array near the top.
- **Use cases** — the `useCases` array.
- **FAQ** — `src/components/marketing/faq.tsx`.
- **Pricing** — reads live from your `plans` table; edit in Admin → Plans.
- **Hero mockup** — `src/components/marketing/hero-preview.tsx`.

The page has no fake customer logos, testimonials or invented statistics, and
you should not add any you cannot back up.

---

## 4. AI models and pricing

**Admin → AI Models.** Add, edit, enable, disable or remove models.

Costs are stored as your currency per **1,000,000 tokens**, matching how
providers publish pricing. Every cost figure in the product is calculated from
these rows, so when a provider changes prices you update them here and nothing
else.

The `Model ID` must be exactly what the provider's API expects
(`gpt-4o-mini`, `gemini-2.0-flash`, `claude-sonnet-4-5`).

Defaults ship in `prisma/seed-data/models.ts`.

---

## 5. Plans, limits and currency

**Admin → Plans.** Edit names, descriptions, monthly and yearly prices, the
three limits, and the feature bullet list shown on the pricing page.

- `-1` in any limit field means **unlimited**.
- Limits are checked on every relevant request, so changes apply immediately to
  everyone on that plan.
- Currency symbol is set once in Admin → Settings and used everywhere.

Defaults ship in `prisma/seed-data/plans.ts`.

---

## 6. Agent templates

**Admin → Templates** to create, edit, publish, unpublish, feature or delete.

To change what a *fresh install* ships with, edit
`prisma/seed-data/templates.ts` and re-seed. Each entry needs a name, slug,
description, category, icon, system prompt, model, temperature and welcome
message.

Template quality is what buyers of your product will judge first — a strong
system prompt is worth more than another feature.

---

## 7. Prompt library

Edit `prisma/seed-data/prompts.ts` and run `npm run db:seed`. The seed only
inserts prompts when the table is empty, so clear it first if you are replacing
the set:

```sql
DELETE FROM prompts;
```

---

## 8. Icons

Agent and template icons come from `src/components/ui/agent-icon.tsx`. Add an
entry to the `AGENT_ICONS` map and it appears in every icon picker:

```tsx
import { Rocket } from 'lucide-react'

export const AGENT_ICONS = {
  // …
  rocket: Rocket,
}
```

All icons are from [lucide-react](https://lucide.dev), ISC licensed — free to
use and redistribute commercially.

---

## 9. Email (password reset)

No email provider is bundled. The reset flow is complete and secure — it creates
a hashed, expiring, single-use token — but the link is logged to the server
console rather than sent.

Open `src/app/api/auth/forgot-password/route.ts` and replace the marked block:

```ts
// Replace the console.log with your provider, for example Resend:
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: email,
  subject: 'Reset your password',
  html: `<p>Click to choose a new password:</p><p><a href="${resetUrl}">Reset password</a></p>
         <p>This link expires in one hour.</p>`,
})
```

Then delete the development fallback that returns `resetUrl` in the response.

---

## 10. Admin account

Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env` **before** seeding a
fresh database, or promote any existing user in **Admin → Users**.

This template uses a role on the user record rather than a separate admin login
table, so there is one identity and one session to reason about. If you need a
fully separate admin realm, gate `src/app/(admin)/layout.tsx` differently — every
admin API route independently calls `requireAdmin()`, so the security boundary
does not depend on the UI.

---

## 11. Removing the demo data

Sample records are flagged `is_demo = true`:

```sql
DELETE FROM users WHERE is_demo = true;   -- cascades to their agents and runs
```

Or empty the `demoAgents` and `automationBlueprints` arrays in `prisma/seed.ts`
so a fresh install starts clean while still getting plans, models, templates and
prompts.

---

## 12. Turning off Demo Mode

Once real provider keys are configured, set `DEMO_MODE="false"`. Missing keys
then produce a clear error instead of a simulated reply. Delete
`src/lib/ai/simulator.ts` if you do not want the simulator in your shipped
product at all.
