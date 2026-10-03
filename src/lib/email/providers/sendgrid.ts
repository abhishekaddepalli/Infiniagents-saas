import { EmailError, EmailProvider } from '../types'

/** SendGrid v3 Mail Send. Needs SENDGRID_API_KEY. */
export const sendgridProvider: EmailProvider = {
  id: 'sendgrid',
  label: 'SendGrid',

  async send(message, from) {
    const apiKey = process.env.SENDGRID_API_KEY
    if (!apiKey) throw new EmailError('SENDGRID_API_KEY is not set.')

    // SendGrid wants a bare address in `from.email`, not "Name <addr>".
    const address = from.match(/<([^>]+)>/)?.[1] ?? from
    const name = from.includes('<') ? from.split('<')[0].trim().replace(/^"|"$/g, '') : undefined

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: address, ...(name ? { name } : {}) },
        subject: message.subject,
        content: [
          { type: 'text/plain', value: message.text },
          { type: 'text/html', value: message.html },
        ],
      }),
    })

    if (!response.ok) {
      console.error('[agentflow] SendGrid rejected the message:', await response.text())
      throw new EmailError(`SendGrid returned HTTP ${response.status}.`)
    }
  },
}
