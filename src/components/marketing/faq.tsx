'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const faqs = [
  {
    question: 'Do I need an API key to try this?',
    answer:
      'No. The template ships with Demo Mode enabled, which answers AI requests with a built-in simulator so you can explore agents, the playground, and automations immediately. Add an OpenAI, Gemini, or Anthropic key under Settings → AI Providers whenever you are ready for real completions.',
  },
  {
    question: 'Which AI providers are supported?',
    answer:
      'OpenAI, Google Gemini, and Anthropic are built in. They all sit behind one provider interface, so adding another provider means writing a single file and registering it — no changes anywhere else in the codebase. Any OpenAI-compatible gateway also works by changing one environment variable.',
  },
  {
    question: 'Where are API keys stored?',
    answer:
      'Provider keys are encrypted with AES-256-GCM before they are written to the database, and they are never sent to the browser. The interface only ever shows a masked hint such as sk-••••••••82a. All AI calls happen server-side.',
  },
  {
    question: 'How do the automations work?',
    answer:
      'You build a workflow on a visual canvas from seven node types — trigger, AI agent, condition, text input, HTTP request, delay, and output — then connect them. The execution engine walks the graph from the trigger, carrying a text payload from node to node, and records every step in the execution history.',
  },
  {
    question: 'Can I change the branding?',
    answer:
      'Yes. The application name, logo, favicon, support email, currency, footer, and legal links are all editable from the admin panel without touching code. Colours are defined as design tokens in one CSS file, so a full re-skin is a small edit.',
  },
  {
    question: 'Is token usage and cost tracking accurate?',
    answer:
      'Token counts come from the provider response where available, with a character-based estimate as a fallback. Costs are calculated from per-model prices stored in the database, which you edit in Admin → AI Models — nothing is hardcoded, because provider pricing changes regularly.',
  },
  {
    question: 'How does billing work?',
    answer:
      'The plan and subscription architecture is complete — plans, limits, enforcement, and the plan-management interface all work. Payment gateway processing is not connected; Stripe and Razorpay are documented as an optional integration so you can wire up the gateway your market needs.',
  },
  {
    question: 'What do I need to run it?',
    answer:
      'Node.js 18.18 or newer and a PostgreSQL database. Install dependencies, copy the environment file, run the migration and the seed, and start the dev server — the whole setup takes a few minutes.',
  },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="mx-auto max-w-3xl divide-y divide-line rounded-xl border border-line bg-surface">
      {faqs.map((faq, index) => {
        const expanded = open === index
        return (
          <div key={faq.question}>
            <button
              onClick={() => setOpen(expanded ? null : index)}
              aria-expanded={expanded}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-[15px] font-medium text-ink">{faq.question}</span>
              <ChevronDown
                className={cn('h-4 w-4 shrink-0 text-muted transition-transform', expanded && 'rotate-180')}
              />
            </button>
            {expanded && (
              <p className="animate-fade-in px-5 pb-5 text-sm leading-relaxed text-muted">{faq.answer}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
