import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { AppError, ok, route } from '@/lib/api'
import { createSession, verifyPassword } from '@/lib/auth'
import { loginSchema } from '@/lib/validation'
import { clientIp, limit } from '@/lib/rate-limit'

export const POST = route(async (request: NextRequest) => {
  // 10 attempts per IP per 15 minutes, to slow down credential stuffing.
  limit(`login:${clientIp(request)}`, 10, 15 * 60_000)

  const { email, password } = loginSchema.parse(await request.json())
  const user = await prisma.user.findUnique({ where: { email } })

  // The same message for a missing user and a wrong password, so the endpoint
  // cannot be used to discover which emails have accounts.
  const invalid = new AppError('Incorrect email or password.', 401)
  if (!user) throw invalid
  if (!(await verifyPassword(password, user.passwordHash))) throw invalid

  if (user.status === 'DISABLED') {
    throw new AppError('This account has been disabled. Contact support for help.', 403)
  }

  await createSession(user.id)
  return ok({ redirectTo: user.role === 'ADMIN' ? '/admin' : '/dashboard' })
})
