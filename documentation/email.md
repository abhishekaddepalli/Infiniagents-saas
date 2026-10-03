# Email

Password resets, email verification and team invitations all need a mail
transport. The template ships four, behind one interface.

---

## Choosing a transport

Set `EMAIL_PROVIDER` in `.env`:

| Value | Transport | Needs |
|---|---|---|
| `console` *(default)* | Prints to the server log | Nothing |
| `smtp` | Any SMTP server | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` |
| `resend` | [Resend](https://resend.com) | `RESEND_API_KEY` |
| `sendgrid` | SendGrid | `SENDGRID_API_KEY` |

Also set the sender:

```env
EMAIL_FROM="Your Product <noreply@yourdomain.com>"
```

`smtp` covers Mailgun, Postmark, Amazon SES, Zoho, Gmail and most corporate mail
servers — they all speak SMTP, so a dedicated provider module is rarely needed.

---

## The console default

A fresh install sends nothing. Messages are printed to the server log:

```
━━━━━━━━━━━━━━━━━━━━━━ EMAIL (not actually sent) ━━━━━━━━━━━━━━━━━━━━━━
From:    AgentFlow AI <noreply@example.com>
To:      someone@example.com
Subject: Reset your password

Reset your password
...
━━━━━━━━━━━━━━━━━ set EMAIL_PROVIDER to send for real ━━━━━━━━━━━━━━━━━
```

This is deliberate: the template must run with zero configuration. So that the
flows are still usable during setup, the application **also returns the link in
the UI** when no transport is configured — the password reset screen shows the
reset URL, and the invite dialog shows a copyable invitation link.

Both behaviours disappear the moment `EMAIL_PROVIDER` is set to anything else.
**Set it before launch**, or your users will never receive a password reset.

---

## What gets sent

| Trigger | Template |
|---|---|
| Registration | Verify email + Welcome |
| Forgot password | Reset link (expires in 1 hour) |
| Team invitation | Invitation link (expires in 7 days) |
| `SEND_EMAIL` automation node | Whatever the workflow produced |

Templates live in `src/lib/email/templates.ts` as plain functions returning HTML
and a text fallback — no template engine, so restyling means editing the markup.
They read the application name and support email from your admin settings, so
branding carries into email automatically.

---

## Email verification is encouraged, not enforced

New accounts are usable immediately; the verification link simply confirms the
address. This is on purpose — a misconfigured mail setup should not lock every
new user out of the product they just signed up for.

To require verification instead, add a check in `src/app/(app)/layout.tsx`:

```ts
if (!user.emailVerifiedAt) redirect('/verify-email-required')
```

...and build that page. Be sure "resend confirmation" works first.

---

## Adding a transport

1. Create `src/lib/email/providers/<name>.ts` exporting an `EmailProvider`:

```ts
import { EmailError, EmailProvider } from '../types'

export const postmarkProvider: EmailProvider = {
  id: 'postmark',
  label: 'Postmark',
  async send(message, from) {
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': process.env.POSTMARK_TOKEN ?? '',
      },
      body: JSON.stringify({
        From: from,
        To: message.to,
        Subject: message.subject,
        HtmlBody: message.html,
        TextBody: message.text,
      }),
    })
    if (!response.ok) {
      console.error('[agentflow] Postmark rejected the message:', await response.text())
      throw new EmailError(`Postmark returned HTTP ${response.status}.`)
    }
  },
}
```

2. Register it in the `providers` map in `src/lib/email/index.ts`.
3. Set `EMAIL_PROVIDER=postmark`.

Nothing else changes.

---

## Failures never break the action

`sendEmail()` returns a boolean and never throws. A failed welcome email must
not fail the registration that triggered it — the failure is logged server-side
and the user still gets their account.

Where the user is genuinely waiting on the result (the `SEND_EMAIL` automation
node), `sendEmailOrThrow()` is used instead so the run is marked failed.

---

## Deliverability

Getting mail into inboxes is a domain configuration problem, not a code problem:

- Verify your sending domain with your provider.
- Publish **SPF**, **DKIM** and **DMARC** records.
- Send from a real subdomain you control (`mail.yourdomain.com`), not a free
  mailbox.
- Do not send from an address that cannot receive replies.
