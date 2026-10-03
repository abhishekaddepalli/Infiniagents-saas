import 'server-only'
import { consoleProvider } from './providers/console'
import { resendProvider } from './providers/resend'
import { sendgridProvider } from './providers/sendgrid'
import { smtpProvider } from './providers/smtp'
import { EmailError, EmailMessage, EmailProvider } from './types'
import { getSettings } from '../settings'
import { env } from '../env'
import type { BrandContext } from './templates'

/**
 * Transport registry. Selected with EMAIL_PROVIDER in `.env`.
 * Defaults to `console`, which logs instead of sending — so a fresh install
 * works with nothing configured.
 */
export const providers: Record<string, EmailProvider> = {
  console: consoleProvider,
  smtp: smtpProvider,
  resend: resendProvider,
  sendgrid: sendgridProvider,
}

export function activeProvider(): EmailProvider {
  const id = (process.env.EMAIL_PROVIDER || 'console').toLowerCase()
  return providers[id] ?? consoleProvider
}

export function isEmailConfigured() {
  return (process.env.EMAIL_PROVIDER || 'console').toLowerCase() !== 'console'
}

/** Branding for templates, read from the admin-managed settings. */
export async function brand(): Promise<BrandContext> {
  const settings = await getSettings()
  return {
    appName: settings.appName,
    appUrl: env.appUrl,
    supportEmail: settings.supportEmail,
  }
}

/**
 * Sends one message.
 *
 * Never throws to the caller: a failed welcome email must not fail the
 * registration that triggered it. Returns whether the hand-off succeeded so
 * callers can decide what to tell the user.
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const from = process.env.EMAIL_FROM || 'AgentFlow AI <noreply@example.com>'
  try {
    await activeProvider().send(message, from)
    return true
  } catch (error) {
    const detail = error instanceof EmailError ? error.message : String(error)
    console.error(`[agentflow] could not send "${message.subject}" to ${message.to}: ${detail}`)
    return false
  }
}

/** Throwing variant, for places where the user is waiting on the result. */
export async function sendEmailOrThrow(message: EmailMessage): Promise<void> {
  const from = process.env.EMAIL_FROM || 'AgentFlow AI <noreply@example.com>'
  await activeProvider().send(message, from)
}

export * from './templates'
export type { EmailMessage } from './types'
