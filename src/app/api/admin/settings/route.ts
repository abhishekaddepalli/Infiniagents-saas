import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, route } from '@/lib/api'
import { requireAdmin } from '@/lib/auth'
import { DEFAULT_SETTINGS, saveSettings } from '@/lib/settings'

// Accept only known setting keys, each a short string.
const schema = z.object(
  Object.fromEntries(
    Object.keys(DEFAULT_SETTINGS).map((key) => [key, z.string().max(500).optional()]),
  ) as Record<keyof typeof DEFAULT_SETTINGS, z.ZodOptional<z.ZodString>>,
)

export const PATCH = route(async (request: NextRequest) => {
  await requireAdmin()
  const values = schema.parse(await request.json())
  await saveSettings(values)
  return ok({ saved: true })
})
