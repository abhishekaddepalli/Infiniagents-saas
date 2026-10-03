'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, Check, KeyRound, Mail, Sparkles, Workflow } from 'lucide-react'
import { AgentIcon } from '@/components/ui/agent-icon'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

type TemplateOption = {
  id: string
  name: string
  description: string
  icon: string
  category: string
}

/**
 * First-run experience.
 *
 * Three short steps: name the workspace, pick a starting agent, and see what
 * to do next. Everything is skippable — an onboarding flow that blocks the
 * product is worse than no onboarding at all.
 */
export function OnboardingFlow({
  appName,
  userName,
  workspaceName,
  hasWorkspace,
  templates,
  demoMode,
  emailConfigured,
  emailVerified,
}: {
  appName: string
  userName: string
  workspaceName: string
  hasWorkspace: boolean
  templates: TemplateOption[]
  demoMode: boolean
  emailConfigured: boolean
  emailVerified: boolean
}) {
  const router = useRouter()
  const toast = useToast()

  const [step, setStep] = useState(0)
  const [name, setName] = useState(workspaceName || `${userName.split(' ')[0]}'s Workspace`)
  const [busy, setBusy] = useState(false)
  const [chosen, setChosen] = useState<string | null>(null)

  async function saveWorkspace() {
    setBusy(true)
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceName: name }),
      })
      if (!response.ok) {
        const data = await response.json()
        toast.error('Could not save that name', data.error)
        return
      }
      setStep(1)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function applyTemplate(templateId: string) {
    setChosen(templateId)
    setBusy(true)
    try {
      const response = await fetch(`/api/templates/${templateId}/use`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        toast.error('Could not create the agent', data.error)
        setChosen(null)
        return
      }
      toast.success('Agent created')
      setStep(2)
    } finally {
      setBusy(false)
    }
  }

  async function finish() {
    setBusy(true)
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      router.push('/dashboard')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const steps = ['Workspace', 'First agent', 'Next steps']

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress */}
      <div className="mb-8 flex items-center gap-2">
        {steps.map((label, index) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-medium transition-colors',
                index < step
                  ? 'bg-brand-600 text-white'
                  : index === step
                    ? 'bg-brand-500/15 text-brand-600 ring-2 ring-brand-500 dark:text-brand-300'
                    : 'bg-elevated text-muted',
              )}
            >
              {index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                'hidden text-[13px] sm:block',
                index === step ? 'font-medium text-ink' : 'text-muted',
              )}
            >
              {label}
            </span>
            {index < steps.length - 1 && <span className="h-px flex-1 bg-line" />}
          </div>
        ))}
      </div>

      {/* ---------------------------- Step 1 ----------------------------- */}
      {step === 0 && (
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Welcome to {appName}, {userName.split(' ')[0]}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Everything you build lives in a workspace — agents, automations, usage and billing. You
            can rename it later, and create more for different teams or clients.
          </p>

          <div className="mt-6 max-w-sm">
            <Field label="Workspace name" required>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Acme AI Team"
                autoFocus
              />
            </Field>
          </div>

          <div className="mt-6 flex gap-2">
            <Button onClick={saveWorkspace} loading={busy} disabled={name.trim().length < 2}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
            {hasWorkspace && (
              <Button variant="ghost" onClick={finish} disabled={busy}>
                Skip setup
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------- Step 2 ----------------------------- */}
      {step === 1 && (
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Start with an agent</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Pick a ready-made agent to add to your workspace. You can edit its instructions, model
            and settings afterwards — nothing here is permanent.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template.id)}
                disabled={busy}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-4 text-left transition-colors disabled:opacity-60',
                  chosen === template.id
                    ? 'border-brand-600 bg-brand-500/5'
                    : 'border-line hover:bg-elevated',
                )}
              >
                <AgentIcon name={template.icon} />
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium text-ink">{template.name}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[12px] leading-relaxed text-muted">
                    {template.description}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex gap-2">
            <Button variant="ghost" onClick={() => setStep(2)} disabled={busy}>
              I&apos;ll create my own later
            </Button>
          </div>
        </div>
      )}

      {/* ---------------------------- Step 3 ----------------------------- */}
      {step === 2 && (
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">You&apos;re set up</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Here is what most people do next.
          </p>

          <div className="mt-6 space-y-3">
            {demoMode && (
              <NextStep
                icon={KeyRound}
                title="Add an AI provider key"
                body="You are running in Demo Mode, so replies come from a built-in simulator. Add an OpenAI, Gemini or Anthropic key under Settings → AI Providers for real completions."
              />
            )}
            <NextStep
              icon={Sparkles}
              title="Test your agent in the playground"
              body="Chat with it and watch the tokens, cost and response time for every reply."
            />
            <NextStep
              icon={Workflow}
              title="Build an automation"
              body="Chain agents and actions on a canvas, then run it manually or from a webhook."
            />
            {!emailVerified && emailConfigured && (
              <NextStep
                icon={Mail}
                title="Confirm your email address"
                body="Check your inbox for the confirmation link we sent when you signed up."
              />
            )}
          </div>

          <div className="mt-6">
            <Button onClick={finish} loading={busy}>
              Go to dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function NextStep({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-line bg-bg p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-300">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[14px] font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{body}</p>
      </div>
    </div>
  )
}
