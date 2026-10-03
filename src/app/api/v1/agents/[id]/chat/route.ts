import { NextRequest } from 'next/server'
import { ok, route } from '@/lib/api'
import { requireApiKey } from '@/lib/api-keys'
import { apiChatSchema } from '@/lib/validation'
import { runCompletion, runStream } from '@/lib/ai'
import { finishChat, prepareChat, sse } from '@/lib/chat'
import { clientIp, limit } from '@/lib/rate-limit'

type Context = { params: Promise<{ id: string }> }

/**
 * POST /api/v1/agents/:id/chat — send a message to an agent.
 * Scope: chat:write
 *
 * Body: { "message": "...", "conversationId": "optional", "stream": false }
 * With `stream: true` the response is Server-Sent Events, identical in shape
 * to the playground's stream.
 */
export const POST = route(async (request: NextRequest, context: Context) => {
  const { workspaceId, keyId } = await requireApiKey(request, 'chat:write')
  limit(`v1chat:${keyId}:${clientIp(request)}`, 60, 60_000)

  const { id } = await context.params
  const { message, conversationId, stream: wantsStream } = apiChatSchema.parse(await request.json())

  const prepared = await prepareChat({
    workspaceId,
    // API traffic has no signed-in user; usage is attributed to the workspace.
    userId: null,
    agentId: id,
    conversationId,
    message,
  })
  const { agent } = prepared

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
      userId: null,
      conversationId: prepared.conversationId,
      agent,
      text: completion.text,
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      latencyMs: completion.latencyMs,
      sources: prepared.sources,
      source: 'api',
    })

    return ok({
      data: {
        id: messageId,
        conversationId: prepared.conversationId,
        role: 'assistant',
        content: completion.text,
        usage: {
          inputTokens: completion.inputTokens,
          outputTokens: completion.outputTokens,
          costUsd,
        },
        sources: prepared.sources.map((chunk) => ({
          document: chunk.documentName,
          score: Math.round(chunk.score * 1000) / 1000,
        })),
        simulated: completion.simulated,
      },
    })
  }

  const started = Date.now()
  const encoder = new TextEncoder()

  const body = new ReadableStream({
    async start(controller) {
      const push = (event: string, data: unknown) => controller.enqueue(encoder.encode(sse(event, data)))
      let text = ''
      let inputTokens = 0
      let outputTokens = 0

      try {
        push('start', { conversationId: prepared.conversationId })

        for await (const chunk of runStream({
          workspaceId,
          provider: agent.provider,
          model: agent.model,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
          messages: prepared.messages,
        })) {
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
          userId: null,
          conversationId: prepared.conversationId,
          agent,
          text,
          inputTokens,
          outputTokens,
          latencyMs,
          sources: prepared.sources,
          source: 'api',
        })

        push('done', {
          id: messageId,
          conversationId: prepared.conversationId,
          usage: { inputTokens, outputTokens, costUsd },
        })
      } catch (error) {
        console.error('[agentflow] v1 chat stream failed:', error)
        push('error', {
          error: error instanceof Error ? error.message : 'The agent could not reply.',
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
})
