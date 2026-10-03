import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/logo'
import { getSettings } from '@/lib/settings'

/**
 * Shared frame for the Terms and Privacy pages.
 *
 * The content in those pages is placeholder text for you to replace — it is
 * not legal advice and has not been reviewed by a lawyer.
 */
export async function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  const settings = await getSettings()

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Logo appName={settings.appName} logoUrl={settings.logoUrl || undefined} href="/" />
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated: {updated}</p>

        <div className="mt-6 rounded-xl border border-warn/20 bg-warn/10 p-4 text-[13px] leading-relaxed text-muted">
          <span className="font-medium text-ink">Placeholder content.</span> Replace this page with terms written
          for your own product and jurisdiction before you launch. Nothing here is legal advice.
        </div>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-muted">{children}</div>

        <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
          Questions? Contact{' '}
          <a href={`mailto:${settings.supportEmail}`} className="text-brand-600 hover:underline dark:text-brand-300">
            {settings.supportEmail}
          </a>
          .
        </p>
      </main>
    </div>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-ink">{title}</h2>
      {children}
    </section>
  )
}
