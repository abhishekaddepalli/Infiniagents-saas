import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ok, route } from '@/lib/api'
import { requireUser } from '@/lib/auth'

const schema = z.object({ theme: z.enum(['light', 'dark', 'system']) })

/** Persists the theme choice so it follows the user across devices. */
export const PATCH = route(async (request: NextRequest) => {
  const user = await requireUser()
  const { theme } = schema.parse(await request.json())
  await prisma.user.update({ where: { id: user.id }, data: { theme } })
  return ok({ theme })
})
