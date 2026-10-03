import parser from 'cron-parser'

/**
 * Cron evaluation for scheduled automations.
 *
 * A workflow is due when its expression fired between the last time we ran it
 * and now. Tracking `lastRunAt` — rather than only looking at a time window —
 * means a scheduler that runs late, or twice, still produces exactly one run
 * per slot.
 */
export function isValidCron(expression: string): boolean {
  try {
    parser.parseExpression(expression)
    return true
  } catch {
    return false
  }
}

/** Human-readable next fire time, for display in the builder. */
export function nextRun(expression: string, timezone = 'UTC'): Date | null {
  try {
    return parser.parseExpression(expression, { tz: timezone }).next().toDate()
  } catch {
    return null
  }
}

export function isDue(options: {
  expression: string | null
  timezone?: string
  lastRunAt?: Date | null
  /** How far back a run may be claimed, for a scheduler that fires late. */
  graceMs?: number
  now?: Date
}): boolean {
  const { expression } = options
  if (!expression) return false

  const now = options.now ?? new Date()
  const graceMs = options.graceMs ?? 10 * 60_000

  let previous: Date
  try {
    previous = parser
      .parseExpression(expression, { tz: options.timezone || 'UTC', currentDate: now })
      .prev()
      .toDate()
  } catch {
    // An invalid expression never fires, rather than firing constantly.
    return false
  }

  // Too long ago — the scheduler was down; do not fire a stale slot.
  if (now.getTime() - previous.getTime() > graceMs) return false

  // Already ran for this slot.
  if (options.lastRunAt && options.lastRunAt >= previous) return false

  return true
}
