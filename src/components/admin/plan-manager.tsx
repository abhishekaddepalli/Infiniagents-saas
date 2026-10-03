'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Switch, Textarea } from '@/components/ui/input'
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'

export type PlanRow = {
  id: string
  name: string
  slug: string
  description: string
  priceMonthly: number
  priceYearly: number
  maxAgents: number
  maxRequests: number
  maxAutomations: number
  maxMembers: number
  maxDocuments: number
  stripePriceMonthlyId: string | null
  stripePriceYearlyId: string | null
  razorpayPlanMonthlyId: string | null
  razorpayPlanYearlyId: string | null
  features: string[]
  highlighted: boolean
  active: boolean
  subscribers: number
}

const limitLabel = (value: number) => (value === -1 ? 'Unlimited' : value.toLocaleString('en-US'))

/**
 * Admin → Plans.
 * Editing a plan changes what every subscriber on it is allowed to do
 * immediately — limits are read from these rows on each request.
 */
export function PlanManager({ plans, currencySymbol }: { plans: PlanRow[]; currencySymbol: string }) {
  const router = useRouter()
  const toast = useToast()
  const [editing, setEditing] = useState<PlanRow | null>(null)
  const [draft, setDraft] = useState<PlanRow | null>(null)
  const [featureText, setFeatureText] = useState('')
  const [busy, setBusy] = useState(false)

  function open(plan: PlanRow) {
    setDraft({ ...plan })
    setFeatureText(plan.features.join('\n'))
    setEditing(plan)
  }

  async function save() {
    if (!draft) return
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/plans/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          priceMonthly: draft.priceMonthly,
          priceYearly: draft.priceYearly,
          maxAgents: draft.maxAgents,
          maxRequests: draft.maxRequests,
          maxAutomations: draft.maxAutomations,
          maxMembers: draft.maxMembers,
          maxDocuments: draft.maxDocuments,
          stripePriceMonthlyId: draft.stripePriceMonthlyId || null,
          stripePriceYearlyId: draft.stripePriceYearlyId || null,
          razorpayPlanMonthlyId: draft.razorpayPlanMonthlyId || null,
          razorpayPlanYearlyId: draft.razorpayPlanYearlyId || null,
          // One feature per line in the textarea.
          features: featureText.split('\n').map((line) => line.trim()).filter(Boolean),
          highlighted: draft.highlighted,
          active: draft.active,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error('Could not save the plan', data.error)
        return
      }
      toast.success('Plan updated')
      setEditing(null)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Plan</Th>
              <Th className="text-right">Monthly</Th>
              <Th className="text-right">Yearly</Th>
              <Th className="text-right">Agents</Th>
              <Th className="text-right">Requests</Th>
              <Th className="text-right">Automations</Th>
              <Th className="text-right">Members</Th>
              <Th className="text-right">Subscribers</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <Tr key={plan.id}>
                <Td>
                  <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
                    {plan.name}
                    {plan.highlighted && <Badge tone="brand">Popular</Badge>}
                  </p>
                  <p className="max-w-xs truncate text-[11px] text-muted">{plan.description}</p>
                </Td>
                <Td className="text-right font-mono text-xs">
                  {currencySymbol}
                  {plan.priceMonthly}
                </Td>
                <Td className="text-right font-mono text-xs">
                  {currencySymbol}
                  {plan.priceYearly}
                </Td>
                <Td className="text-right font-mono text-xs">{limitLabel(plan.maxAgents)}</Td>
                <Td className="text-right font-mono text-xs">{limitLabel(plan.maxRequests)}</Td>
                <Td className="text-right font-mono text-xs">{limitLabel(plan.maxAutomations)}</Td>
                <Td className="text-right font-mono text-xs">{limitLabel(plan.maxMembers)}</Td>
                <Td className="text-right font-mono text-xs">{plan.subscribers}</Td>
                <Td>
                  <Badge tone={plan.active ? 'success' : 'neutral'} dot>
                    {plan.active ? 'Active' : 'Hidden'}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <button
                    onClick={() => open(plan)}
                    className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-ink"
                    aria-label={`Edit ${plan.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>

      <p className="mt-3 text-xs text-muted">
        Enter <span className="font-mono">-1</span> for an unlimited allowance. Limits are enforced on every request,
        so changes take effect immediately.
      </p>

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`Edit the ${editing?.name} plan`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} loading={busy}>
              Save plan
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <Field label="Plan name" required>
              <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Field>

            <Field label="Description">
              <Input
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`Monthly price (${currencySymbol})`}>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.priceMonthly}
                  onChange={(event) => setDraft({ ...draft, priceMonthly: Number(event.target.value) })}
                />
              </Field>
              <Field label={`Yearly price (${currencySymbol})`}>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.priceYearly}
                  onChange={(event) => setDraft({ ...draft, priceYearly: Number(event.target.value) })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Max agents">
                <Input
                  type="number"
                  min="-1"
                  value={draft.maxAgents}
                  onChange={(event) => setDraft({ ...draft, maxAgents: Number(event.target.value) })}
                />
              </Field>
              <Field label="Max requests / month">
                <Input
                  type="number"
                  min="-1"
                  value={draft.maxRequests}
                  onChange={(event) => setDraft({ ...draft, maxRequests: Number(event.target.value) })}
                />
              </Field>
              <Field label="Max automations">
                <Input
                  type="number"
                  min="-1"
                  value={draft.maxAutomations}
                  onChange={(event) => setDraft({ ...draft, maxAutomations: Number(event.target.value) })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Max team members">
                <Input
                  type="number"
                  min="-1"
                  value={draft.maxMembers}
                  onChange={(event) => setDraft({ ...draft, maxMembers: Number(event.target.value) })}
                />
              </Field>
              <Field label="Max knowledge documents">
                <Input
                  type="number"
                  min="-1"
                  value={draft.maxDocuments}
                  onChange={(event) => setDraft({ ...draft, maxDocuments: Number(event.target.value) })}
                />
              </Field>
            </div>

            {/* Gateway price identifiers, needed before a paid plan can be
                purchased. Create the matching product in the gateway first. */}
            <div className="space-y-4 rounded-lg border border-line bg-bg p-4">
              <p className="text-[13px] font-medium text-ink">Payment gateway IDs</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Stripe price (monthly)">
                  <Input
                    value={draft.stripePriceMonthlyId ?? ''}
                    onChange={(event) => setDraft({ ...draft, stripePriceMonthlyId: event.target.value })}
                    placeholder="price_..."
                    className="font-mono text-[13px]"
                  />
                </Field>
                <Field label="Stripe price (yearly)">
                  <Input
                    value={draft.stripePriceYearlyId ?? ''}
                    onChange={(event) => setDraft({ ...draft, stripePriceYearlyId: event.target.value })}
                    placeholder="price_..."
                    className="font-mono text-[13px]"
                  />
                </Field>
                <Field label="Razorpay plan (monthly)">
                  <Input
                    value={draft.razorpayPlanMonthlyId ?? ''}
                    onChange={(event) => setDraft({ ...draft, razorpayPlanMonthlyId: event.target.value })}
                    placeholder="plan_..."
                    className="font-mono text-[13px]"
                  />
                </Field>
                <Field label="Razorpay plan (yearly)">
                  <Input
                    value={draft.razorpayPlanYearlyId ?? ''}
                    onChange={(event) => setDraft({ ...draft, razorpayPlanYearlyId: event.target.value })}
                    placeholder="plan_..."
                    className="font-mono text-[13px]"
                  />
                </Field>
              </div>
              <p className="text-[11px] leading-relaxed text-muted">
                Leave blank for free plans. Without these, a paid plan cannot be purchased and
                checkout returns a clear error naming the missing ID.
              </p>
            </div>

            <Field label="Features" hint="One feature per line — these appear on the pricing page.">
              <Textarea rows={6} value={featureText} onChange={(event) => setFeatureText(event.target.value)} />
            </Field>

            <div className="space-y-4 border-t border-line pt-4">
              <Switch
                checked={draft.highlighted}
                onChange={(highlighted) => setDraft({ ...draft, highlighted })}
                label="Mark as most popular"
                description="Highlights this plan on the pricing page."
              />
              <Switch
                checked={draft.active}
                onChange={(active) => setDraft({ ...draft, active })}
                label="Visible to users"
                description="Hidden plans stay attached to existing subscribers but are not offered to anyone new."
              />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
