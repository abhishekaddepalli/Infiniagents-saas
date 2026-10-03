import { formatCurrency, formatNumber } from '@/lib/utils'

/**
 * Charts are client components rendered from server components, and functions
 * cannot cross that boundary. So charts take a serializable format *name*
 * instead of a formatter function, and resolve it here.
 */
export type ValueFormat = 'number' | 'currency' | 'plain'

export function formatValue(value: number, format: ValueFormat = 'number', currencySymbol = '$'): string {
  if (format === 'currency') return formatCurrency(value, currencySymbol)
  if (format === 'plain') return value.toLocaleString('en-US')
  return formatNumber(value)
}
