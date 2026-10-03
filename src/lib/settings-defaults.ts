/**
 * Branding & application defaults.
 *
 * Kept in its own file with no imports so the Prisma seed script can read it
 * without pulling in the React/server runtime.
 *
 * These are the values a fresh install starts with. The admin panel
 * (Admin → Settings) overrides them in the `settings` table, so a buyer can
 * rebrand the entire product without editing code.
 */
export const DEFAULT_SETTINGS = {
  appName: 'AgentFlow AI',
  appTagline: 'Build AI agents that work for you',
  logoUrl: '',
  faviconUrl: '',
  supportEmail: 'support@example.com',
  currency: 'USD',
  currencySymbol: '$',
  defaultProvider: 'OPENAI',
  defaultModel: 'gpt-4o-mini',
  websiteUrl: 'https://example.com',
  termsUrl: '/terms',
  privacyUrl: '/privacy',
  footerText: '© AgentFlow AI. All rights reserved.',
  allowRegistration: 'true',
}

export type SettingsKey = keyof typeof DEFAULT_SETTINGS
export type AppSettings = Record<SettingsKey, string>
