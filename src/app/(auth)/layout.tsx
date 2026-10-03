import Link from 'next/link'
import { ArrowLeft, Bot, LineChart, Workflow } from 'lucide-react'
import { Logo } from '@/components/logo'
import { getSettings } from '@/lib/settings'

const highlights = [
  { icon: Bot, title: 'AI agents', body: 'Configure instructions, model, and limits per agent.' },
  { icon: Workflow, title: 'Automations', body: 'Chain agents into workflows on a visual canvas.' },
  { icon: LineChart, title: 'Usage tracking', body: 'See tokens and estimated cost for every run.' },
]

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings()

  return (
    <div className="flex min-h-screen">
      {/* Form column */}
      <div className="flex w-full flex-col px-5 py-8 lg:w-1/2 lg:px-14">
        <div className="flex items-center justify-between">
          <Logo appName={settings.appName} logoUrl={settings.logoUrl || undefined} href="/" />
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>

        <p className="text-center text-xs text-muted">{settings.footerText}</p>
      </div>

      {/* Decorative column, hidden on small screens */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 lg:block">
        <div className="absolute inset-0 opacity-20" aria-hidden>
          <div className="grid-backdrop h-full w-full" />
        </div>
        <div className="relative flex h-full flex-col justify-center px-14">
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-white">
            {settings.appTagline}
          </h2>
          <p className="mt-4 max-w-md text-white/70">
            Create intelligent AI assistants and automate repetitive workflows from one simple platform.
          </p>

          <div className="mt-10 space-y-5">
            {highlights.map((item) => (
              <div key={item.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-0.5 text-sm text-white/60">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
