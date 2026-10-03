import 'server-only'
import { prisma } from './db'
import { AppError } from './api'
import { randomToken, sha256 } from './crypto'

/**
 * API key issuing and verification for the public REST API (`/api/v1`).
 *
 * Keys are shown to the user exactly once, at creation. Only a SHA-256 hash is
 * stored — a database leak yields nothing usable, and there is deliberately no
 * way to recover a lost key. bcrypt is not used here because verification
 * happens on every API request and needs to be fast; the key is 32 random
 * bytes, so it has no guessable structure for a hash to protect against.
 */

const PREFIX = 'af'

export type IssuedKey = { id: string; key: string; prefix: string }

export async function issueApiKey(options: {
  workspaceId: string
  userId: string
  name: string
  scopes: string[]
  expiresInDays: number
}): Promise<IssuedKey> {
  const secret = randomToken(32)
  const environment = process.env.NODE_ENV === 'production' ? 'live' : 'test'
  const key = `${PREFIX}_${environment}_${secret}`

  const record = await prisma.apiKey.create({
    data: {
      workspaceId: options.workspaceId,
      createdById: options.userId,
      name: options.name,
      keyHash: sha256(key),
      // Enough of the key to identify it in a list, not enough to use it.
      keyPrefix: `${PREFIX}_${environment}_${secret.slice(0, 6)}`,
      scopes: options.scopes,
      expiresAt:
        options.expiresInDays > 0
          ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
          : null,
    },
  })

  return { id: record.id, key, prefix: record.keyPrefix }
}

export type ApiKeyContext = {
  keyId: string
  workspaceId: string
  scopes: string[]
}

/**
 * Authenticates a request carrying `Authorization: Bearer af_...`.
 * Returns null when no key is present, and throws when one is present but bad —
 * so a caller can distinguish "not an API request" from "rejected".
 */
export async function authenticateApiKey(request: Request): Promise<ApiKeyContext | null> {
  const header = request.headers.get('authorization') ?? ''
  const match = header.match(/^Bearer\s+(\S+)$/i)
  if (!match) return null

  const key = match[1]
  if (!key.startsWith(`${PREFIX}_`)) return null

  const record = await prisma.apiKey.findUnique({
    where: { keyHash: sha256(key) },
    select: { id: true, workspaceId: true, scopes: true, revokedAt: true, expiresAt: true },
  })

  if (!record) throw new AppError('Invalid API key.', 401)
  if (record.revokedAt) throw new AppError('This API key has been revoked.', 401)
  if (record.expiresAt && record.expiresAt < new Date()) {
    throw new AppError('This API key has expired.', 401)
  }

  // Best-effort: a failed timestamp update must not fail the request.
  prisma.apiKey
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined)

  return { keyId: record.id, workspaceId: record.workspaceId, scopes: record.scopes }
}

/** Authenticates and requires a scope, for use at the top of a v1 route. */
export async function requireApiKey(request: Request, scope: string): Promise<ApiKeyContext> {
  const context = await authenticateApiKey(request)
  if (!context) {
    throw new AppError(
      'Missing API key. Send it as: Authorization: Bearer af_live_your_key',
      401,
    )
  }
  if (!context.scopes.includes(scope)) {
    throw new AppError(`This API key does not have the "${scope}" scope.`, 403)
  }
  return context
}
