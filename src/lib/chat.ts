import 'server-only'
import { prisma } from './db'
import { AppError } from './api'
import { assertWithinLimit } from './plans'
import { calculateCost } from './pricing'
import { buildContextBlock, searchKnowledgeBase, type RetrievedChunk } from './knowledge/search'
import type { ChatMessage } from './ai'

/**
 * Shared chat pipeline.
 *
 * Both the playground (`/api/chat`) and the public API (`/api/v1`) run through
 * here, so retrieval, memory, limits and usage accounting behave identically
 * whichever door a request comes in by.
 */

/** How many earlier turns to replay when an agent has memory enabled. */
const MEMORY_TURNS = 10

export type PreparedChat = {
  agent: Awaited<ReturnType<typeof loadAgent>>
  conversationId: string
  messages: ChatMessage[]
  sources: RetrievedChunk[]
}

async function loadAgent(workspaceId: string, agentId: string) {
  const agent = await prisma.agent.findFirst({ where: { id: agentId, workspaceId } })
  if (!agent) throw new AppError('Agent not found.', 404)
  if (agent.status === 'INACTIVE') {
    throw new AppError('This agent is disabled. Enable it from the agent editor to use it.', 400)
  }
  return agent
}

/**
 * Resolves the agent, thread and prompt for one chat turn, and writes the
 * user's message. Returns everything the caller needs to run a completion.
 */
export async function prepareChat(options: {
  workspaceId: string
  /** Null for public-API traffic, which has no signed-in user. */
  userId: string | null
  agentId: string
  conversationId?: string | null
  message: string
}): Promise<PreparedChat> {
  const { workspaceId, userId, agentId, message } = options

  await assertWithinLimit(workspaceId, 'requests')
  const agent = await loadAgent(workspaceId, agentId)

  // Reuse the conversation when one was passed, otherwise start a new thread.
  const existing = options.conversationId
    ? await prisma.conversation.findFirst({
        where: { id: options.conversationId, workspaceId },
      })
    : null

  const thread =
    existing ??
    (await prisma.conversation.create({
      data: {
        workspaceId,
        userId: userId || null,
        agentId: agent.id,
        // The first user message makes a better title than "New conversation".
        title: message.slice(0, 60),
      },
    }))

  const history: ChatMessage[] = []
  if (agent.memoryEnabled) {
    const previous = await prisma.message.findMany({
      where: { conversationId: thread.id },
      orderBy: { createdAt: 'desc' },
      take: MEMORY_TURNS * 2,
      select: { role: true, content: true },
    })
    history.push(
      ...previous
        .reverse()
        .map((entry) => ({ role: entry.role as 'user' | 'assistant', content: entry.content })),
    )
  }

  // Retrieval-augmented generation, when the agent has a knowledge base.
  let sources: RetrievedChunk[] = []
  let systemPrompt = agent.systemPrompt
  if (agent.knowledgeBaseId) {
    sources = await searchKnowledgeBase({
      workspaceId,
      knowledgeBaseId: agent.knowledgeBaseId,
      query: message,
    })
    const context = buildContextBlock(sources)
    if (context) systemPrompt = `${systemPrompt}\n\n${context}`
  }

  await prisma.message.create({
    data: { conversationId: thread.id, role: 'user', content: message },
  })

  return {
    agent,
    conversationId: thread.id,
    sources,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ],
  }
}

/**
 * Persists the assistant reply and its usage.
 * Called once a completion finishes, streamed or not.
 */
export async function finishChat(options: {
  workspaceId: string
  userId: string | null
  conversationId: string
  agent: { id: string; provider: 'OPENAI' | 'GEMINI' | 'ANTHROPIC'; model: string }
  text: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  sources: RetrievedChunk[]
  source: string
}) {
  const costUsd = await calculateCost(
    options.agent.provider,
    options.agent.model,
    options.inputTokens,
    options.outputTokens,
  )

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: options.conversationId,
        role: 'assistant',
        content: options.text,
        sources: options.sources.map((chunk) => ({
          documentId: chunk.documentId,
          documentName: chunk.documentName,
          score: Math.round(chunk.score * 1000) / 1000,
        })),
        inputTokens: options.inputTokens,
        outputTokens: options.outputTokens,
        costUsd,
        latencyMs: options.latencyMs,
      },
    }),
    prisma.aiUsage.create({
      data: {
        workspaceId: options.workspaceId,
        userId: options.userId,
        agentId: options.agent.id,
        provider: options.agent.provider,
        model: options.agent.model,
        inputTokens: options.inputTokens,
        outputTokens: options.outputTokens,
        costUsd,
        latencyMs: options.latencyMs,
        source: options.source,
      },
    }),
    prisma.conversation.update({
      where: { id: options.conversationId },
      data: { updatedAt: new Date() },
    }),
  ])

  return { messageId: message.id, costUsd }
}

/** Encodes one Server-Sent Event. */
export function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}
