/**
 * Central environment access. Import from here instead of touching
 * `process.env` directly so missing configuration fails loudly and early.
 */
function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". Copy .env.example to .env and fill it in.`,
    )
  }
  return value
}

export const env = {
  get databaseUrl() {
    return required('DATABASE_URL')
  },
  get authSecret() {
    return required('AUTH_SECRET')
  },
  get encryptionKey() {
    return required('ENCRYPTION_KEY')
  },
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  openaiKey: process.env.OPENAI_API_KEY || '',
  geminiKey: process.env.GEMINI_API_KEY || '',
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  demoMode: (process.env.DEMO_MODE || 'true').toLowerCase() === 'true',
  isProduction: process.env.NODE_ENV === 'production',
}
