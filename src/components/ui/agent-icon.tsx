'use client'
import {
  Bot, Headphones, TrendingUp, PenLine, Microscope, Mail, Search, Package, Share2,
  UserCheck, FileText, Lightbulb, CircleHelp, Sparkles, Braces, Bug, Calculator,
  Camera, Code, Database, Globe, Heart, MessageSquare, Music, Rocket, Shield,
  ShoppingCart, Star, Wand2, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Icon registry for agents and templates.
 * Icons come from lucide-react (ISC licence — free for commercial use and
 * redistribution). Add entries here to offer more choices in the icon picker.
 */
export const AGENT_ICONS = {
  bot: Bot, sparkles: Sparkles, headphones: Headphones, 'trending-up': TrendingUp,
  'pen-line': PenLine, microscope: Microscope, mail: Mail, search: Search,
  package: Package, 'share-2': Share2, 'user-check': UserCheck, 'file-text': FileText,
  lightbulb: Lightbulb, 'circle-help': CircleHelp, braces: Braces, bug: Bug,
  calculator: Calculator, camera: Camera, code: Code, database: Database,
  globe: Globe, heart: Heart, 'message-square': MessageSquare, music: Music,
  rocket: Rocket, shield: Shield, 'shopping-cart': ShoppingCart, star: Star,
  wand: Wand2, zap: Zap,
} as const

export type AgentIconName = keyof typeof AGENT_ICONS

export function AgentIcon({
  name,
  className,
  size = 'md',
}: {
  name: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const Icon = AGENT_ICONS[name as AgentIconName] ?? Bot
  const boxes = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', lg: 'h-14 w-14 rounded-2xl' }
  const icons = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center bg-brand-500/10 text-brand-600 dark:text-brand-300',
        boxes[size],
        className,
      )}
    >
      <Icon className={icons[size]} />
    </span>
  )
}

/** Grid picker used in the agent and template editors. */
export function IconPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="scroll-thin grid max-h-40 grid-cols-8 gap-1.5 overflow-y-auto rounded-lg border border-line bg-surface p-2 sm:grid-cols-10">
      {Object.entries(AGENT_ICONS).map(([name, Icon]) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          aria-label={`Select ${name} icon`}
          aria-pressed={value === name}
          className={cn(
            'flex aspect-square items-center justify-center rounded-lg transition-colors',
            value === name
              ? 'bg-brand-600 text-white'
              : 'text-muted hover:bg-elevated hover:text-ink',
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}
