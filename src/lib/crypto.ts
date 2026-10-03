import crypto from 'crypto'
import { env } from './env'

/**
 * AES-256-GCM encryption for AI provider API keys stored in the database.
 * Format: base64(iv).base64(authTag).base64(ciphertext)
 *
 * The key comes from ENCRYPTION_KEY. Rotating that value makes existing
 * stored keys unreadable — users simply re-enter them.
 */
function key(): Buffer {
  const raw = Buffer.from(env.encryptionKey, 'base64')
  // Accept either a 32-byte base64 value or any string, normalised by SHA-256.
  return raw.length === 32 ? raw : crypto.createHash('sha256').update(env.encryptionKey).digest()
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), enc.toString('base64')].join('.')
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.')
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed ciphertext')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8')
}

/** Builds the masked hint shown in the UI, e.g. `sk-proj-••••••••82a`. */
export function maskKey(value: string): string {
  const clean = value.trim()
  if (clean.length <= 8) return '••••••••'
  return `${clean.slice(0, 3)}${'•'.repeat(8)}${clean.slice(-3)}`
}

/** Hashes password-reset tokens so a database leak cannot be replayed. */
export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}
