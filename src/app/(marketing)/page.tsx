import Link from 'next/link'
import {
  Activity, BarChart3, Bot, Braces, FileText, GitBranch, Gauge,
  Headphones, Layers, Lock, PenLine, Play, Shield, Sparkles, TrendingUp, Workflow, Zap,
} from 'lucide-react'
import { MarketingNav } from '@/components/marketing/nav'
import { HeroPreview } from '@/components/marketing/hero-preview'
import { Faq } from '@/components/marketing/faq'
import { PricingTable } from '@/components/marketing/pricing'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { getCurrentUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const features = [
  {
    icon: Bot,
    title: 'AI Agents',
    body: 'Give each agent its own instructions, model, temperature, and token budget. Duplicate a working agent, disable one you are not using, and test any of them in the playground.',
  },
  {
    icon: Workflow,
    title: 'Automation',
    body: 'Chain agents together on a visual canvas. Seven node types cover triggers, conditions, HTTP calls, delays, and outputs — enough to build something real without an engineering project.',
  },
  {
    icon: Layers,
    title: 'Templates',
    body: 'Twelve production-ready agent templates across support, sales, content, SEO, and research. One click turns any template into an agent on your account.',
  },
  {
    icon: Braces,
    title: 'Multiple AI models',
    body: 'OpenAI, Google Gemini, and Anthropic behind a single provider interface. Switch a model per agent, and add a new provider by writing one file.',
  },
  {
    icon: Play,
    title: 'Workflow execution',
    body: 'Run a workflow manually or fire it from a webhook. The engine walks your graph step by step and records what each node received and returned.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    body: 'Requests, input and output tokens, and estimated cost — broken down by day, by agent, and by model, with prices you control rather than ones baked into the code.',
  },
]

const useCases = [
  { icon: Headphones, title: 'Customer support', body: 'Triage incoming tickets by urgency, draft the first reply, and escalate the rest with a clean summary.' },
  { icon: TrendingUp, title: 'Sales operations', body: 'Score inbound leads against your criteria and generate the matching follow-up before anyone opens the CRM.' },
  { icon: PenLine, title: 'Content production', body: 'Go from a topic to an SEO brief to a finished draft in one workflow instead of four tools.' },
  { icon: FileText, title: 'Internal reporting', body: 'Pull data on a schedule, summarise it, and deliver a digest your team will actually read.' },
]

export default async function LandingPage() {
  const [settings, user, plans] = await Promise.all([
    getSettings(),
    getCurrentUser(),
    prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
  ])

  return (
    <div className="min-h-screen">
      <MarketingNav appName={settings.appName} signedIn={Boolean(user)} />

      {/* ------------------------------- Hero ------------------------------ */}
      <section className="relative overflow-hidden">
        <div className="grid-backdrop absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto max-w-6xl px-5 pb-20 pt-16 text-center sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted">
            <Sparkles className="h-3.5 w-3.5 text-brand-600 dark:text-brand-300" />
            Works with OpenAI, Gemini and Anthropic
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-6xl">
            Build AI agents that{' '}
            <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
              work for you
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Create intelligent AI assistants and automate repetitive workflows from one simple platform.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                View Demo
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-xs text-muted">
            No API key needed to explore — Demo Mode simulates AI responses out of the box.
          </p>

          <div className="mt-14">
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* ----------------------------- Features ---------------------------- */}
      <section id="features" className="border-t border-line bg-surface/50 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Everything you need to ship AI features
            </h2>
            <p className="mt-4 text-muted">
              Agents, automations, and the tracking that tells you what they cost — in one application you own the
              source code to.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-line bg-surface p-6 shadow-card transition-shadow hover:shadow-pop"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
                  <feature.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------- API integration ------------------------ */}
      <section className="border-t border-line py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted">
              <GitBranch className="h-3.5 w-3.5" />
              API integration
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-ink">
              Trigger a workflow from anything
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Every automation can expose a webhook endpoint. Post a payload from your product, a form, a CRM, or a
              cron job, and the workflow runs server-side with the result stored in your execution history.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                { icon: Lock, text: 'Each webhook carries its own secret key — rotate it any time' },
                { icon: Activity, text: 'Every run is recorded with input, output, tokens, and duration' },
                { icon: Shield, text: 'Outbound HTTP nodes are blocked from reaching private networks' },
              ].map((item) => (
                <li key={item.text} className="flex gap-3 text-sm text-muted">
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>

          <div className="scroll-thin overflow-x-auto rounded-2xl border border-line bg-[#0d0d14] p-5 shadow-pop">
            <pre className="font-mono text-[13px] leading-relaxed text-gray-300">
              <code>{`curl -X POST \\
  https://your-app.com/api/webhooks/ab12cd34ef56 \\
  -H "Content-Type: application/json" \\
  -d '{"input": "Customer cannot log in"}'

{
  "executionId": "clx8f2...",
  "status": "COMPLETED",
  "output": "Thanks for reaching out...",
  "tokens": { "input": 284, "output": 176 },
  "durationMs": 1840
}`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ----------------------------- Use cases --------------------------- */}
      <section id="use-cases" className="border-t border-line bg-surface/50 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Built for real workflows</h2>
            <p className="mt-4 text-muted">
              Four of the automations you can build on day one — all five ship as working examples in the demo data.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {useCases.map((useCase) => (
              <div key={useCase.title} className="flex gap-4 rounded-2xl border border-line bg-surface p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
                  <useCase.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-ink">{useCase.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{useCase.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ Pricing ---------------------------- */}
      <section id="pricing" className="border-t border-line py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Simple, configurable pricing</h2>
            <p className="mt-4 text-muted">
              These plans and limits are examples stored in your database — edit every price, limit, and feature from
              the admin panel.
            </p>
          </div>

          <div className="mt-12">
            <PricingTable
              plans={plans}
              currencySymbol={settings.currencySymbol}
              ctaHref={user ? '/dashboard' : '/register'}
            />
          </div>
        </div>
      </section>

      {/* -------------------------------- FAQ ------------------------------ */}
      <section id="faq" className="border-t border-line bg-surface/50 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Frequently asked questions</h2>
          </div>
          <div className="mt-12">
            <Faq />
          </div>
        </div>
      </section>

      {/* ------------------------------- CTA ------------------------------- */}
      <section className="border-t border-line py-20">
        <div className="mx-auto max-w-4xl px-5">
          <div className="rounded-2xl border border-line bg-gradient-to-br from-brand-600 to-brand-800 px-8 py-14 text-center shadow-pop">
            <Gauge className="mx-auto h-10 w-10 text-white/80" />
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white">Start building in minutes</h2>
            <p className="mx-auto mt-3 max-w-lg text-white/80">
              Create your account, pick a template, and watch your first agent run.
            </p>
            <Link href="/register" className="mt-7 inline-block">
              <Button size="lg" className="bg-white text-brand-700 hover:bg-white/90">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------ Footer ----------------------------- */}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Logo appName={settings.appName} logoUrl={settings.logoUrl || undefined} />
              <p className="mt-3 max-w-xs text-sm text-muted">{settings.appTagline}</p>
            </div>

            <div>
              <h3 className="text-[13px] font-semibold text-ink">Product</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li><a href="#features" className="hover:text-ink">Features</a></li>
                <li><a href="#pricing" className="hover:text-ink">Pricing</a></li>
                <li><a href="#use-cases" className="hover:text-ink">Use cases</a></li>
                <li><a href="#faq" className="hover:text-ink">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-[13px] font-semibold text-ink">Company</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>
                  <a href={`mailto:${settings.supportEmail}`} className="hover:text-ink">
                    Support
                  </a>
                </li>
                <li><Link href={settings.termsUrl} className="hover:text-ink">Terms</Link></li>
                <li><Link href={settings.privacyUrl} className="hover:text-ink">Privacy</Link></li>
                <li><Link href="/login" className="hover:text-ink">Sign in</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 sm:flex-row">
            <p className="text-xs text-muted">{settings.footerText}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Zap className="h-3.5 w-3.5" />
              Built with Next.js, Prisma and PostgreSQL
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
