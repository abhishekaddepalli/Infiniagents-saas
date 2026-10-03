import { Bot, CircleCheck, Sparkles, Workflow, Zap } from 'lucide-react'

/**
 * Stylised product preview shown in the hero.
 * A static mock rather than a screenshot, so it stays correct after rebranding.
 */
export function HeroPreview() {
  const stats = [
    { label: 'Agents', value: '6' },
    { label: 'Executions', value: '32' },
    { label: 'Tokens', value: '41.2k' },
    { label: 'Cost', value: '$0.31' },
  ]

  const flow = [
    { icon: Zap, label: 'Trigger', tone: 'text-muted' },
    { icon: Bot, label: 'AI Agent', tone: 'text-brand-600 dark:text-brand-300' },
    { icon: Workflow, label: 'Condition', tone: 'text-muted' },
    { icon: CircleCheck, label: 'Output', tone: 'text-muted' },
  ]

  return (
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-line bg-elevated px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="ml-3 text-xs text-muted">Dashboard</span>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-line bg-bg p-3.5">
              <p className="text-[11px] uppercase tracking-wide text-muted">{stat.label}</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-ink">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-line bg-bg p-4">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-300" />
            <span className="text-xs font-medium text-ink">Support Ticket Triage</span>
            <span className="ml-auto rounded-full border border-ok/20 bg-ok/10 px-2 py-0.5 text-[10px] font-medium text-ok">
              Active
            </span>
          </div>

          <div className="scroll-thin flex items-center gap-2 overflow-x-auto pb-1">
            {flow.map((node, index) => (
              <div key={node.label} className="flex shrink-0 items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
                  <node.icon className={`h-3.5 w-3.5 ${node.tone}`} />
                  <span className="text-[11px] font-medium text-ink">{node.label}</span>
                </div>
                {index < flow.length - 1 && <span className="h-px w-5 bg-line" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
