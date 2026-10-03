import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, route } from '@/lib/api'
import { requireWorkspace } from '@/lib/workspace'
import { chatSchema } from '@/lib/validation'
import { runCompletion, runStream } from '@/lib/ai'
import { finishChat, prepareChat, sse } from '@/lib/chat'
import { limit } from '@/lib/rate-limit'

/**
 * Playground chat.
 *
 * Streams by default: the browser gets tokens as they arrive, then a final
 * `done` event carrying the token counts and cost. Pass `stream: false` for a
 * single JSON response instead.
 */
export const POST = route(async (request: NextRequest) => {
  const { workspaceId, user } = await requireWorkspace()
  // 30 messages per user per minute — protects both the app and the AI bill.
  limit(`chat:${user.id}`, 30, 60_000)

  const body = await request.json()
  const { agentId, conversationId, message } = chatSchema.parse(body)
  const wantsStream = body?.stream !== false

  const prepared = await prepareChat({
    workspaceId,
    userId: user.id,
    agentId,
    conversationId,
    message,
  })
  const { agent } = prepared

  // ------------------------------ non-streaming ----------------------------
  if (!wantsStream) {
    const completion = await runCompletion({
      workspaceId,
      provider: agent.provider,
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      messages: prepared.messages,
    })

    const { messageId, costUsd } = await finishChat({
      workspaceId,
      userId: user.id,
      conversationId: prepared.conversationId,
      agent,
      text: completion.text,
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      latencyMs: completion.latencyMs,
      sources: prepared.sources,
      source: 'playground',
    })

    return ok({
      conversationId: prepared.conversationId,
      message: {
        id: messageId,
        role: 'assistant',
        content: completion.text,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        costUsd,
        latencyMs: completion.latencyMs,
        sources: prepared.sources.map((chunk) => ({
          documentName: chunk.documentName,
          score: chunk.score,
        })),
      },
      simulated: completion.simulated,
    })
  }

  // -------------------------------- streaming ------------------------------
  const started = Date.now()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const push = (event: string, data: unknown) => controller.enqueue(encoder.encode(sse(event, data)))

      let text = ''
      let inputTokens = 0
      let outputTokens = 0
      let simulated = false

      try {
        push('start', {
          conversationId: prepared.conversationId,
          sources: prepared.sources.map((chunk) => ({
            documentName: chunk.documentName,
            score: Math.round(chunk.score * 1000) / 1000,
          })),
        })

        for await (const chunk of runStream({
          workspaceId,
          provider: agent.provider,
          model: agent.model,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
          messages: prepared.messages,
        })) {
          if (chunk.simulated) simulated = true
          if (chunk.type === 'delta') {
            text += chunk.text
            push('delta', { text: chunk.text })
          } else {
            inputTokens = chunk.inputTokens
            outputTokens = chunk.outputTokens
          }
        }

        const latencyMs = Date.now() - started
        const { messageId, costUsd } = await finishChat({
          workspaceId,
          userId: user.id,
          conversationId: prepared.conversationId,
          agent,
          text,
          inputTokens,
          outputTokens,
          latencyMs,
          sources: prepared.sources,
          source: 'playground',
        })

        push('done', {
          id: messageId,
          conversationId: prepared.conversationId,
          inputTokens,
          outputTokens,
          costUsd,
          latencyMs,
          simulated,
        })
      } catch (error) {
        // The response has already begun, so the error has to travel as an
        // event rather than an HTTP status.
        console.error('[agentflow] chat stream failed:', error)
        push('error', {
          error:
            error instanceof Error
              ? error.message
              : 'The agent could not reply. Please try again.',
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Stops nginx buffering the stream into one lump.
      'X-Accel-Buffering': 'no',
    },
  })
})

/** Conversation list for the playground sidebar. */
export const GET = route(async (request: NextRequest) => {
  const { workspaceId, user } = await requireWorkspace()
  const agentId = new URL(request.url).searchParams.get('agentId')

  const conversations = await prisma.conversation.findMany({
    where: { workspaceId, userId: user.id, ...(agentId ? { agentId } : {}) },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      agent: { select: { id: true, name: true, icon: true } },
      _count: { select: { messages: true } },
    },
  })
  return ok({ conversations })
})
