'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BookOpen, Bot, Check, Copy, CornerDownLeft, History, MessageSquarePlus, Sparkles,
  Square, Trash2, User as UserIcon,
} from 'lucide-react'
import { AgentIcon } from '@/components/ui/agent-icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, Textarea } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { MessageContent } from './message-content'
import { formatCurrency, formatDuration, formatNumber, timeAgo } from '@/lib/utils'
import { cn } from '@/lib/utils'

type PlaygroundAgent = {
  id: string
  name: string
  icon: string
  provider: string
  model: string
  status: string
  welcomeMessage: string
  temperature: number
  maxTokens: number
  knowledgeBaseName: string | null
}

type Source = { documentName: string; score: number }

/**
 * Retrieval returns one entry per matching passage, so the same document
 * usually appears several times. Buyers read three identical chips as a bug,
 * so collapse them into one chip per document with a passage count.
 */
function groupSources(sources: Source[]) {
  const byDocument = new Map<string, { documentName: string; score: number; passages: number }>()
  for (const source of sources) {
    const existing = byDocument.get(source.documentName)
    if (existing) {
      existing.passages += 1
      existing.score = Math.max(existing.score, source.score)
    } else {
      byDocument.set(source.documentName, { ...source, passages: 1 })
    }
  }
  return [...byDocument.values()].sort((a, b) => b.score - a.score)
}

type ChatEntry = {
  id: string
  role: 'user' | 'assistant'
  content: string
  inputTokens?: number
  outputTokens?: number
  costUsd?: number
  latencyMs?: number
  sources?: Source[]
  /** True while tokens are still arriving for this message. */
  streaming?: boolean
}

type ConversationSummary = {
  id: string
  title: string
  updatedAt: string
  agent: { id: string; name: string; icon: string }
}

const providerLabels: Record<string, string> = {
  OPENAI: 'OpenAI',
  GEMINI: 'Google Gemini',
  ANTHROPIC: 'Anthropic',
}

export function Playground({
  agents,
  currencySymbol = '$',
}: {
  agents: PlaygroundAgent[]
  currencySymbol?: string
}) {
  const params = useSearchParams()
  const router = useRouter()
  const toast = useToast()

  const [agentId, setAgentId] = useState(() => params.get('agent') || agents[0]?.id || '')
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [simulated, setSimulated] = useState(false)

  const agent = agents.find((item) => item.id === agentId)
  const threadRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Keep the newest message in view as tokens stream in.
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/chat')
      if (!response.ok) return
      const data = await response.json()
      setConversations(data.conversations ?? [])
    } catch {
      // A failed history load is not worth interrupting the user over.
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Stop an in-flight stream if the component unmounts mid-reply.
  useEffect(() => () => abortRef.current?.abort(), [])

  function selectAgent(id: string) {
    setAgentId(id)
    setMessages([])
    setConversationId(null)
    router.replace(`/playground?agent=${id}`, { scroll: false })
  }

  /** Starts a fresh thread. The previous conversation stays saved. */
  function newConversation() {
    abortRef.current?.abort()
    setMessages([])
    setConversationId(null)
    setInput('')
  }

  /** Clears the thread and deletes the stored conversation with it. */
  async function clearConversation() {
    const id = conversationId
    newConversation()
    if (!id) return
    try {
      const response = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Conversation cleared')
        loadConversations()
      }
    } catch {
      // Already cleared on screen; a failed delete is not worth an error toast.
    }
  }

  async function openConversation(summary: ConversationSummary) {
    setHistoryOpen(false)
    try {
      const response = await fetch(`/api/conversations/${summary.id}`)
      if (!response.ok) {
        toast.error('Could not open that conversation')
        return
      }
      const { conversation } = await response.json()
      setAgentId(conversation.agentId)
      setConversationId(conversation.id)
      setMessages(
        conversation.messages
          .filter((message: { role: string }) => message.role !== 'system')
          .map((message: Record<string, unknown>) => ({
            id: String(message.id),
            role: message.role as 'user' | 'assistant',
            content: String(message.content),
            inputTokens: Number(message.inputTokens ?? 0),
            outputTokens: Number(message.outputTokens ?? 0),
            costUsd: Number(message.costUsd ?? 0),
            latencyMs: Number(message.latencyMs ?? 0),
            sources: (message.sources as Source[]) ?? [],
          })),
      )
    } catch {
      toast.error('Could not reach the server')
    }
  }

  /**
   * Sends a message and consumes the Server-Sent Event stream, appending each
   * delta to the in-flight assistant message so text appears as it arrives.
   */
  async function send() {
    const text = input.trim()
    if (!text || !agent || sending) return

    const userEntry: ChatEntry = { id: `local-${Date.now()}`, role: 'user', content: text }
    const assistantId = `stream-${Date.now()}`
    setMessages((current) => [
      ...current,
      userEntry,
      { id: assistantId, role: 'assistant', content: '', streaming: true },
    ])
    setInput('')
    setSending(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, conversationId, message: text, stream: true }),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}))
        toast.error('The agent could not reply', data.error)
        // Roll the failed exchange back out so retrying is clean.
        setMessages((current) =>
          current.filter((entry) => entry.id !== userEntry.id && entry.id !== assistantId),
        )
        setInput(text)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = ''

      const update = (patch: Partial<ChatEntry>) =>
        setMessages((current) =>
          current.map((entry) => (entry.id === assistantId ? { ...entry, ...patch } : entry)),
        )

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // SSE frames are separated by a blank line.
        let boundary: number
        while ((boundary = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)

          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) currentEvent = line.slice(6).trim()
            if (!line.startsWith('data:')) continue

            const payload = JSON.parse(line.slice(5).trim())

            if (currentEvent === 'start') {
              setConversationId(payload.conversationId)
              if (payload.sources?.length) update({ sources: payload.sources })
            } else if (currentEvent === 'delta') {
              setMessages((current) =>
                current.map((entry) =>
                  entry.id === assistantId
                    ? { ...entry, content: entry.content + payload.text }
                    : entry,
                ),
              )
            } else if (currentEvent === 'done') {
              update({
                id: payload.id,
                streaming: false,
                inputTokens: payload.inputTokens,
                outputTokens: payload.outputTokens,
                costUsd: payload.costUsd,
                latencyMs: payload.latencyMs,
              })
              setSimulated(Boolean(payload.simulated))
            } else if (currentEvent === 'error') {
              toast.error('The agent could not finish', payload.error)
              update({ streaming: false })
            }
          }
        }
      }

      update({ streaming: false })
      loadConversations()
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // Deliberate stop — keep whatever text already arrived.
        setMessages((current) =>
          current.map((entry) => (entry.id === assistantId ? { ...entry, streaming: false } : entry)),
        )
      } else {
        toast.error('Could not reach the server', 'Check your connection and try again.')
        setMessages((current) =>
          current.filter((entry) => entry.id !== userEntry.id && entry.id !== assistantId),
        )
        setInput(text)
      }
    } finally {
      abortRef.current = null
      setSending(false)
    }
  }

  async function copy(entry: ChatEntry) {
    try {
      await navigator.clipboard.writeText(entry.content)
      setCopiedId(entry.id)
      setTimeout(() => setCopiedId(null), 1600)
    } catch {
      toast.error('Could not copy', 'Your browser blocked clipboard access.')
    }
  }

  if (agents.length === 0) {
    return (
      <EmptyState
        icon={Bot}
        title="No agents to test"
        description="Create an agent first, then come back here to chat with it and see the tokens it uses."
        action={
          <Link href="/agents/new">
            <Button>Create Agent</Button>
          </Link>
        }
      />
    )
  }

  const lastAssistant = [...messages].reverse().find((entry) => entry.role === 'assistant')
  const totals = messages.reduce(
    (accumulator, entry) => ({
      input: accumulator.input + (entry.inputTokens ?? 0),
      output: accumulator.output + (entry.outputTokens ?? 0),
      cost: accumulator.cost + (entry.costUsd ?? 0),
    }),
    { input: 0, output: 0, cost: 0 },
  )

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      {/* ------------------------------ Thread ------------------------------ */}
      <div className="flex h-[calc(100vh-13rem)] min-h-[520px] min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
          <Select
            value={agentId}
            onChange={(event) => selectAgent(event.target.value)}
            className="max-w-[240px]"
            aria-label="Select an agent"
          >
            {agents.map((item) => (
              <option key={item.id} value={item.id} disabled={item.status === 'INACTIVE'}>
                {item.name}
                {item.status === 'INACTIVE' ? ' (disabled)' : ''}
              </option>
            ))}
          </Select>

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryOpen((value) => !value)}
              title="Past conversations"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={newConversation} disabled={messages.length === 0}>
              <MessageSquarePlus className="h-4 w-4" />
              <span className="hidden sm:inline">New</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={clearConversation} disabled={messages.length === 0}>
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          </div>
        </div>

        {historyOpen && (
          <div className="scroll-thin max-h-56 shrink-0 overflow-y-auto border-b border-line bg-bg">
            {conversations.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">
                No saved conversations yet.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {conversations.map((summary) => (
                  <li key={summary.id}>
                    <button
                      onClick={() => openConversation(summary)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-elevated',
                        summary.id === conversationId && 'bg-elevated',
                      )}
                    >
                      <AgentIcon name={summary.agent.icon} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-ink">{summary.title}</span>
                        <span className="block truncate text-[11px] text-muted">
                          {summary.agent.name} · {timeAgo(summary.updatedAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div ref={threadRef} className="scroll-thin flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <AgentIcon name={agent?.icon ?? 'bot'} size="lg" />
              <h3 className="mt-4 text-base font-semibold text-ink">{agent?.name}</h3>
              <p className="mt-1.5 max-w-sm text-sm text-muted">
                {agent?.welcomeMessage || 'Send a message to test how this agent responds.'}
              </p>
              {agent?.knowledgeBaseName && (
                <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-xs text-muted">
                  <BookOpen className="h-3.5 w-3.5" />
                  Answers from <span className="font-medium text-ink">{agent.knowledgeBaseName}</span>
                </p>
              )}
              {agent?.status === 'INACTIVE' && (
                <p className="mt-3 rounded-lg border border-warn/20 bg-warn/10 px-3 py-2 text-xs text-warn">
                  This agent is disabled. Enable it in the agent editor before testing.
                </p>
              )}
            </div>
          )}

          {messages.map((entry) => (
            <div key={entry.id} className="flex gap-3">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  entry.role === 'user'
                    ? 'bg-elevated text-muted'
                    : 'bg-brand-500/10 text-brand-600 dark:text-brand-300',
                )}
              >
                {entry.role === 'user' ? <UserIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              </span>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[13px] font-medium text-ink">
                    {entry.role === 'user' ? 'You' : agent?.name}
                  </span>
                  {entry.role === 'assistant' && !entry.streaming && entry.content && (
                    <button
                      onClick={() => copy(entry)}
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted transition-colors hover:bg-elevated hover:text-ink"
                    >
                      {copiedId === entry.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedId === entry.id ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>

                <div className="text-ink">
                  {entry.content ? (
                    <MessageContent content={entry.content} />
                  ) : entry.streaming ? (
                    <span className="flex items-center gap-1.5 pt-1">
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="h-1.5 w-1.5 animate-pulse rounded-full bg-faint"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </span>
                  ) : null}
                  {/* A caret while text is still arriving. */}
                  {entry.streaming && entry.content && (
                    <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-brand-500 align-middle" />
                  )}
                </div>

                {entry.sources && entry.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {groupSources(entry.sources).map((source) => (
                      <span
                        key={source.documentName}
                        className="flex items-center gap-1 rounded-md border border-line bg-bg px-1.5 py-0.5 text-[11px] text-muted"
                        title={`Best match ${source.score} · ${source.passages} passage${
                          source.passages === 1 ? '' : 's'
                        } used`}
                      >
                        <BookOpen className="h-3 w-3" />
                        {source.documentName}
                        {source.passages > 1 && (
                          <span className="text-faint">×{source.passages}</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-line p-3">
          <div className="relative">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends; Shift+Enter adds a newline.
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  send()
                }
              }}
              placeholder={`Message ${agent?.name ?? 'your agent'}…`}
              rows={2}
              className="resize-none pr-28"
              disabled={agent?.status === 'INACTIVE'}
            />
            {sending ? (
              <Button
                size="sm"
                variant="secondary"
                className="absolute bottom-2.5 right-2.5"
                onClick={() => abortRef.current?.abort()}
              >
                <Square className="h-3.5 w-3.5" />
                Stop
              </Button>
            ) : (
              <Button
                size="sm"
                className="absolute bottom-2.5 right-2.5"
                onClick={send}
                disabled={!input.trim() || agent?.status === 'INACTIVE'}
              >
                Send
                <CornerDownLeft className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-faint">
            Enter to send · Shift + Enter for a new line
          </p>
        </div>
      </div>

      {/* ------------------------------ Details ----------------------------- */}
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-surface p-4">
          <h3 className="text-[13px] font-semibold text-ink">Run details</h3>

          <dl className="mt-3 space-y-2.5 text-[13px]">
            <Row label="Agent" value={agent?.name ?? '—'} />
            <Row label="Provider" value={providerLabels[agent?.provider ?? ''] ?? '—'} />
            <Row label="Model" value={agent?.model ?? '—'} mono />
            <Row label="Temperature" value={agent ? agent.temperature.toFixed(1) : '—'} mono />
            {agent?.knowledgeBaseName && <Row label="Knowledge" value={agent.knowledgeBaseName} />}
            <div className="border-t border-line pt-2.5" />
            <Row label="Input tokens" value={formatNumber(lastAssistant?.inputTokens ?? 0)} mono />
            <Row label="Output tokens" value={formatNumber(lastAssistant?.outputTokens ?? 0)} mono />
            <Row
              label="Estimated cost"
              value={formatCurrency(lastAssistant?.costUsd ?? 0, currencySymbol)}
              mono
            />
            <Row
              label="Response time"
              value={lastAssistant?.latencyMs ? formatDuration(lastAssistant.latencyMs) : '—'}
              mono
            />
          </dl>
        </div>

        {messages.length > 0 && (
          <div className="rounded-xl border border-line bg-surface p-4">
            <h3 className="text-[13px] font-semibold text-ink">Conversation totals</h3>
            <dl className="mt-3 space-y-2.5 text-[13px]">
              <Row label="Total tokens" value={formatNumber(totals.input + totals.output)} mono />
              <Row label="Total cost" value={formatCurrency(totals.cost, currencySymbol)} mono />
              <Row label="Messages" value={String(messages.length)} mono />
            </dl>
          </div>
        )}

        {simulated && (
          <div className="rounded-xl border border-warn/20 bg-warn/10 p-4">
            <Badge tone="warning">Demo Mode</Badge>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              These responses come from the built-in simulator, not a real model. Add an API key under{' '}
              <Link href="/settings?tab=providers" className="font-medium text-ink underline">
                Settings → AI Providers
              </Link>{' '}
              for real completions.
            </p>
          </div>
        )}

        {agent && (
          <Link href={`/agents/${agent.id}`} className="block">
            <Button variant="secondary" className="w-full">
              Edit this agent
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={cn('min-w-0 truncate text-right text-ink', mono && 'font-mono text-xs')}>{value}</dd>
    </div>
  )
}
