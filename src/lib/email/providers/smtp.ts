import nodemailer from 'nodemailer'
import { EmailError, EmailProvider } from '../types'

/**
 * Generic SMTP, which covers Mailgun, Postmark, Amazon SES, Zoho, Gmail and
 * most corporate mail servers.
 *
 * Needs SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD.
 */
let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  if (!host) throw new EmailError('SMTP_HOST is not set.')

  transporter = nodemailer.createTransport({
    host,
    port,
    // Port 465 is implicit TLS; 587 and 25 upgrade with STARTTLS.
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? '' }
      : undefined,
  })
  return transporter
}

export const smtpProvider: EmailProvider = {
  id: 'smtp',
  label: 'SMTP',

  async send(message, from) {
    try {
      await getTransporter().sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      })
    } catch (error) {
      console.error('[agentflow] SMTP send failed:', error)
      throw new EmailError('The SMTP server rejected the message.')
    }
  },
}
