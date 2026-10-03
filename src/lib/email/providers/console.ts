import { EmailProvider } from '../types'

/**
 * The default transport. Prints the message to the server log instead of
 * sending it, so the template works out of the box with nothing configured.
 *
 * Set EMAIL_PROVIDER to a real transport before going live — until you do,
 * password resets and invitations only appear in your console.
 */
export const consoleProvider: EmailProvider = {
  id: 'console',
  label: 'Console (development only)',

  async send(message, from) {
    console.log(
      [
        '',
        '━━━━━━━━━━━━━━━━━━━━━━ EMAIL (not actually sent) ━━━━━━━━━━━━━━━━━━━━━━',
        `From:    ${from}`,
        `To:      ${message.to}`,
        `Subject: ${message.subject}`,
        '',
        message.text,
        '━━━━━━━━━━━━━━━━━ set EMAIL_PROVIDER to send for real ━━━━━━━━━━━━━━━━━',
        '',
      ].join('\n'),
    )
  },
}
