import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes without conflicts. Used by every UI component. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`
  if (value >= 10_000) return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}k`
  return value.toLocaleString('en-US')
}

/** AI costs are often fractions of a cent, so small values keep more digits. */
export function formatCurrency(value: number, symbol = '$'): string {
  if (value === 0) return `${symbol}0.00`
  if (value < 0.01) return `${symbol}${value.toFixed(4)}`
  return `${symbol}${value.toFixed(2)}`
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function timeAgo(date: Date | string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(date)
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Percentage helper that treats -1 (unlimited) as always 0% consumed. */
export function percentOf(used: number, limit: number): number {
  if (limit === -1 || limit === 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

/**
 * Percentage for display. Real-but-tiny usage reads as "<1%" rather than "0%",
 * which would wrongly suggest nothing has been used at all.
 */
export function percentLabel(used: number, limit: number): string {
  if (limit === -1) return 'Unlimited'
  const percent = percentOf(used, limit)
  if (percent === 0 && used > 0) return '<1%'
  return `${percent}%`
}
