import { cache } from 'react'
import { prisma } from './db'
import { DEFAULT_SETTINGS, type AppSettings, type SettingsKey } from './settings-defaults'

/** Loads all settings merged over the defaults. Cached per request. */
export const getSettings = cache(async (): Promise<AppSettings> => {
  const settings = { ...DEFAULT_SETTINGS } as Record<string, string>

  // `npm run build` before the database is configured is a normal thing to do
  // on a fresh clone. Asking Prisma anyway would print a connection error for
  // every prerendered page, which reads like a broken build when it is not.
  if (!process.env.DATABASE_URL) return settings as AppSettings

  try {
    const rows = await prisma.setting.findMany()
    for (const row of rows) {
      if (row.key in DEFAULT_SETTINGS) settings[row.key] = row.value
    }
  } catch {
    // Before the first migration the table does not exist yet — use defaults
    // so the landing page still renders during setup.
  }
  return settings as AppSettings
})

export async function saveSettings(values: Partial<AppSettings>) {
  const entries = Object.entries(values).filter(([key]) => key in DEFAULT_SETTINGS)
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      }),
    ),
  )
}

export { DEFAULT_SETTINGS }
export type { AppSettings, SettingsKey }
