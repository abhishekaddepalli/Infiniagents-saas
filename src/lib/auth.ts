import 'server-only'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { prisma } from './db'
import { env } from './env'

const COOKIE = 'agentflow_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export type SessionUser = {
  id: string
  name: string
  email: string
  role: 'USER' | 'ADMIN'
  image: string | null
  theme: string
  emailVerifiedAt: Date | null
  lastWorkspaceId: string | null
  onboardedAt: Date | null
}

function secret() {
  return new TextEncoder().encode(env.authSecret)
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret())

  const store = await cookies()
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    path: '/',
    maxAge: MAX_AGE,
  })
}

export async function destroySession() {
  const store = await cookies()
  store.delete(COOKIE)
}

/**
 * Reads the signed session cookie and loads the user.
 * Wrapped in React `cache` so multiple calls in one render hit the DB once.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, secret())
    const userId = payload.sub
    if (typeof userId !== 'string') return null

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, role: true, image: true, status: true,
        theme: true, emailVerifiedAt: true, lastWorkspaceId: true, onboardedAt: true,
      },
    })
    // A disabled account is treated exactly like a signed-out visitor.
    if (!user || user.status === 'DISABLED') return null
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      theme: user.theme,
      emailVerifiedAt: user.emailVerifiedAt,
      lastWorkspaceId: user.lastWorkspaceId,
      onboardedAt: user.onboardedAt,
    }
  } catch {
    return null
  }
})

/** Throws a redirect-friendly error when there is no signed-in user. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  return user
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== 'ADMIN') throw new ForbiddenError()
  return user
}

export class UnauthorizedError extends Error {
  constructor() {
    super('You need to sign in to continue.')
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super('You do not have access to this resource.')
    this.name = 'ForbiddenError'
  }
}
