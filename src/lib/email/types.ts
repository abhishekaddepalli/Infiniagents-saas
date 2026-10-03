export type EmailMessage = {
  to: string
  subject: string
  html: string
  text: string
}

/**
 * Every email transport implements this interface.
 *
 * To add one (Postmark, Mailgun, SES, ...):
 *   1. Create `src/lib/email/providers/<name>.ts` exporting an EmailProvider.
 *   2. Register it in the `providers` map in `src/lib/email/index.ts`.
 *   3. Set EMAIL_PROVIDER=<name> in `.env`.
 * No other file needs to change.
 */
export type EmailProvider = {
  id: string
  label: string
  /** Throws EmailError when the message could not be handed off. */
  send(message: EmailMessage, from: string): Promise<void>
}

export class EmailError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EmailError'
  }
}
