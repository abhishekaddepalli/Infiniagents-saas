import { EmailError, EmailProvider } from '../types'

/** Resend (https://resend.com). Needs RESEND_API_KEY. */
export const resendProvider: EmailProvider = {
  id: 'resend',
  label: 'Resend',

  async send(message, from) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new EmailError('RESEND_API_KEY is not set.')

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    })

    if (!response.ok) {
      // Log the detail server-side; the caller only ever surfaces a safe message.
      console.error('[agentflow] Resend rejected the message:', await response.text())
      throw new EmailError(`Resend returned HTTP ${response.status}.`)
    }
  },
}
