'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatValue, type ValueFormat } from './format'

/**
 * Column chart for daily magnitudes.
 * Bars are capped at 24px, rounded at the data end only, and separated by a
 * gap in the surface colour rather than a stroke.
 */
export function BarChart({
  data,
  color = 'var(--viz-1)',
  height = 200,
  format = 'number',
  currencySymbol = '$',
  unit,
  className,
}: {
  data: { label: string; value: number }[]
  color?: string
  height?: number
  format?: ValueFormat
  currencySymbol?: string
  /** Optional word appended in the tooltip, e.g. "requests". */
  unit?: string
  className?: string
}) {
  const label = (value: number) =>
    `${formatValue(value, format, currencySymbol)}${unit ? ` ${unit}` : ''}`
  const [hover, setHover] = useState<number | null>(null)

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-line text-sm text-muted"
        style={{ height }}
      >
        Nothing recorded yet.
      </div>
    )
  }

  const max = Math.max(1, ...data.map((point) => point.value))

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end gap-[2px]" style={{ height }} onMouseLeave={() => setHover(null)}>
        {data.map((point, index) => (
          <div
            key={point.label + index}
            className="group relative flex h-full flex-1 cursor-default flex-col justify-end"
            onMouseEnter={() => setHover(index)}
          >
            <div
              className="mx-auto w-full max-w-[24px] rounded-t transition-opacity"
              style={{
                height: `${Math.max((point.value / max) * 100, point.value > 0 ? 2 : 0)}%`,
                background: color,
                opacity: hover === null || hover === index ? 1 : 0.45,
              }}
            />
            {hover === index && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-elevated px-2 py-1.5 shadow-pop">
                <p className="text-[11px] font-medium text-ink">{label(point.value)}</p>
                <p className="text-[10px] text-muted">{point.label}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}

/**
 * Horizontal ranked bars — used for "usage by agent" and provider breakdowns.
 * Every bar shares one colour: the categories are nominal, so length carries
 * the magnitude and hue would only double-encode it.
 */
export function RankedBars({
  data,
  format = 'plain',
  currencySymbol = '$',
  color = 'var(--viz-1)',
  className,
}: {
  data: { label: string; value: number; hint?: string }[]
  format?: ValueFormat
  currencySymbol?: string
  color?: string
  className?: string
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No usage recorded yet.</p>
  }
  const max = Math.max(1, ...data.map((item) => item.value))

  return (
    <div className={cn('space-y-3', className)}>
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] font-medium text-ink">{item.label}</span>
            <span className="shrink-0 font-mono text-xs text-muted">
              {formatValue(item.value, format, currencySymbol)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-elevated">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%`, background: color }}
            />
          </div>
          {item.hint && <p className="mt-1 text-[11px] text-muted">{item.hint}</p>}
        </div>
      ))}
    </div>
  )
}
