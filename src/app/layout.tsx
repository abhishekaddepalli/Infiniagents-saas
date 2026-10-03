import type { Metadata } from 'next'
import { ThemeProvider, themeScript } from '@/components/theme-provider'
import { ToastProvider } from '@/components/ui/toast'
import { getSettings } from '@/lib/settings'
import './globals.css'

/**
 * Page metadata is generated from the admin-managed settings, so renaming the
 * product in Admin → Settings updates the browser title and favicon too.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: { default: `${settings.appName} — ${settings.appTagline}`, template: `%s · ${settings.appName}` },
    description:
      'Create intelligent AI assistants and automate repetitive workflows from one simple platform.',
    icons: settings.faviconUrl ? { icon: settings.faviconUrl } : undefined,
    robots: { index: true, follow: true },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the saved theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
