import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { MessageContent } from '@/components/playground/message-content'
import { requireWorkspace } from '@/lib/workspace'
import { getSettings } from '@/lib/settings'
import { prisma } from '@/lib/db'
import { formatCurrency, formatDateTime, formatDuration, formatNumber } from '@/lib/utils'

export const metadata = { title: 'Execution detail' }
export const dynamic = 'force-dynamic'

type Step = { nodeId: string; label: string; type: string; status: string; output: string; ms: number }

export default async function ExecutionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { workspaceId, user } = await requireWorkspace()
  const { id } = await params

  const [execution, settings] = await Promise.all([
    prisma.execution.findFirst({
      where: { id, workspaceId },
      include: {
        automation: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true } },
      },
    }),
    getSettings(),
  ])
  if (!execution) notFound()

  const steps = (execution.steps as unknown as Step[]) ?? []
  const symbol = settings.currencySymbol

  const facts = [
    { label: 'Execution ID', value: execution.id, mono: true },
    { label: 'Automation', value: execution.automation?.name ?? '—' },
    { label: 'Agent', value: execution.agent?.name ?? '—' },
    { label: 'Triggered by', value: execution.source },
    { label: 'Started', value: formatDateTime(execution.startedAt) },
    { label: 'Duration', value: formatDuration(execution.durationMs), mono: true },
    { label: 'Input tokens', value: formatNumber(execution.inputTokens), mono: true },
    { label: 'Output tokens', value: formatNumber(execution.outputTokens), mono: true },
    { label: 'Estimated cost', value: formatCurrency(execution.costUsd, symbol), mono: true },
  ]

  return (
    <div>
      <PageHeader
        title="Execution detail"
        description={`Run of ${execution.automation?.name ?? 'a workflow'}`}
        action={
          <Link href="/executions">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Back to history
            </Button>
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {execution.error && (
            <div className="flex gap-3 rounded-xl border border-danger/20 bg-danger/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <div>
                <p className="text-sm font-medium text-danger">This run failed</p>
                <p className="mt-1 text-[13px] text-muted">{execution.error}</p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader title="Input" description="What the workflow received" />
            <CardBody>
              <pre className="scroll-thin max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-bg p-3.5 font-mono text-[12px] leading-relaxed text-ink">
                {execution.input || 'No input was provided.'}
              </pre>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Steps" description="What each node received and returned" />
            <CardBody className="space-y-3">
              {steps.length === 0 && <p className="text-sm text-muted">No step trace was recorded for this run.</p>}
              {steps.map((step, index) => (
                <div key={`${step.nodeId}-${index}`} className="rounded-lg border border-line bg-bg">
                  <div className="flex items-center gap-3 border-b border-line px-3.5 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-elevated font-mono text-[11px] text-muted">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{step.label}</p>
                      <p className="font-mono text-[11px] text-muted">{step.type}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-muted">{formatDuration(step.ms)}</span>
                    <StatusBadge
                      status={
                        step.status === 'completed' ? 'COMPLETED' : step.status === 'failed' ? 'FAILED' : 'DRAFT'
                      }
                    />
                  </div>
                  {step.output && (
                    <pre className="scroll-thin max-h-40 overflow-auto whitespace-pre-wrap px-3.5 py-3 font-mono text-[12px] leading-relaxed text-muted">
                      {step.output}
                    </pre>
                  )}
                </div>
              ))}
            </CardBody>
          </Card>

          {execution.output && (
            <Card>
              <CardHeader title="Output" description="The final result of the workflow" />
              <CardBody>
                <div className="rounded-lg border border-line bg-bg p-4 text-ink">
                  <MessageContent content={execution.output} />
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardHeader
              title="Summary"
              action={<StatusBadge status={execution.status} />}
            />
            <CardBody>
              <dl className="space-y-3 text-[13px]">
                {facts.map((fact) => (
                  <div key={fact.label} className="flex items-baseline justify-between gap-3">
                    <dt className="shrink-0 text-muted">{fact.label}</dt>
                    <dd className={`min-w-0 truncate text-right text-ink ${fact.mono ? 'font-mono text-xs' : ''}`}>
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {execution.automation && (
                <Link href={`/automations/${execution.automation.id}`} className="mt-4 block">
                  <Button variant="secondary" className="w-full">
                    Open automation
                  </Button>
                </Link>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
