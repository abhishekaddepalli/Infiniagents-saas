'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field, Input, Select, Switch } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import type { AppSettings } from '@/lib/settings-defaults'

export type ModelChoice = { provider: string; modelId: string; name: string }

/**
 * Admin → Settings.
 * This is the single screen a buyer uses to rebrand the product: name, logo,
 * favicon, currency, legal links, and the default model for new agents.
 */
export function GlobalSettings({
  settings,
  models,
}: {
  settings: AppSettings
  models: ModelChoice[]
}) {
  const router = useRouter()
  const toast = useToast()
  const [draft, setDraft] = useState<AppSettings>(settings)
  const [saving, setSaving] = useState(false)

  const set = (key: keyof AppSettings, value: string) => setDraft((current) => ({ ...current, [key]: value }))
  const providerModels = models.filter((model) => model.provider === draft.defaultProvider)

  async function save() {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error('Could not save settings', data.error)
        return
      }
      toast.success('Settings saved', 'Reload any open pages to see the new branding.')
      router.refresh()
    } catch {
      toast.error('Could not reach the server')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Branding" description="Rename and re-skin the product without touching code" />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Application name" required>
              <Input value={draft.appName} onChange={(event) => set('appName', event.target.value)} />
            </Field>
            <Field label="Tagline">
              <Input value={draft.appTagline} onChange={(event) => set('appTagline', event.target.value)} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Logo URL" hint="Leave blank to use the built-in mark.">
              <Input
                value={draft.logoUrl}
                onChange={(event) => set('logoUrl', event.target.value)}
                placeholder="https://example.com/logo.svg"
              />
            </Field>
            <Field label="Favicon URL" hint="A 32×32 PNG or ICO works well.">
              <Input
                value={draft.faviconUrl}
                onChange={(event) => set('faviconUrl', event.target.value)}
                placeholder="https://example.com/favicon.ico"
              />
            </Field>
          </div>

          <Field label="Footer text">
            <Input value={draft.footerText} onChange={(event) => set('footerText', event.target.value)} />
          </Field>

          <p className="rounded-lg border border-line bg-bg p-3.5 text-[13px] leading-relaxed text-muted">
            To change the colour scheme, edit the <span className="font-mono text-ink">--brand-*</span> variables in{' '}
            <span className="font-mono text-ink">src/app/globals.css</span>. Everything in the product reads from
            them.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Contact & links" description="Shown in the footer and on auth screens" />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Support email" required>
              <Input
                type="email"
                value={draft.supportEmail}
                onChange={(event) => set('supportEmail', event.target.value)}
              />
            </Field>
            <Field label="Website URL">
              <Input value={draft.websiteUrl} onChange={(event) => set('websiteUrl', event.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Terms URL">
              <Input value={draft.termsUrl} onChange={(event) => set('termsUrl', event.target.value)} />
            </Field>
            <Field label="Privacy URL">
              <Input value={draft.privacyUrl} onChange={(event) => set('privacyUrl', event.target.value)} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Defaults" description="What new agents and price displays start from" />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Currency code" hint="Used for labelling only — no conversion is applied.">
              <Input
                value={draft.currency}
                onChange={(event) => set('currency', event.target.value.toUpperCase())}
                placeholder="USD"
                maxLength={6}
              />
            </Field>
            <Field label="Currency symbol">
              <Input
                value={draft.currencySymbol}
                onChange={(event) => set('currencySymbol', event.target.value)}
                placeholder="$"
                maxLength={4}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default AI provider">
              <Select
                value={draft.defaultProvider}
                onChange={(event) => {
                  const provider = event.target.value
                  const first = models.find((model) => model.provider === provider)
                  setDraft({ ...draft, defaultProvider: provider, defaultModel: first?.modelId ?? '' })
                }}
              >
                <option value="OPENAI">OpenAI</option>
                <option value="GEMINI">Google Gemini</option>
                <option value="ANTHROPIC">Anthropic</option>
              </Select>
            </Field>
            <Field label="Default model">
              <Select value={draft.defaultModel} onChange={(event) => set('defaultModel', event.target.value)}>
                <option value="">Select a model</option>
                {providerModels.map((model) => (
                  <option key={model.modelId} value={model.modelId}>
                    {model.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Switch
            checked={draft.allowRegistration === 'true'}
            onChange={(value) => set('allowRegistration', value ? 'true' : 'false')}
            label="Allow new registrations"
            description="Turn this off to close public sign-ups. Existing users can still sign in."
          />
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} loading={saving}>
          <Save className="h-4 w-4" />
          Save settings
        </Button>
      </div>
    </div>
  )
}
