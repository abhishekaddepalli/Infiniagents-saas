import 'server-only'
import { ExecutionSource, Prisma } from '@prisma/client'
import { prisma } from '../db'
import { AppError } from '../api'
import { runCompletion } from '../ai'
import { calculateCost } from '../pricing'
import { assertWithinLimit } from '../plans'
import { isSafeOutboundUrl } from './url-guard'
import { searchKnowledgeBase, buildContextBlock } from '../knowledge/search'
import { automationTemplate, brand, sendEmailOrThrow } from '../email'

/**
 * The workflow execution engine.
 *
 * It walks the node graph from the trigger, carrying a single text payload
 * from node to node. That deliberate simplicity is the point: a buyer can read
 * this file top to bottom and understand exactly how their automations run.
 *
 * To add a node type:
 *   1. Add it to the NodeType enum in prisma/schema.prisma.
 *   2. Add a `case` to `runNode()` below.
 *   3. Add its entry in src/components/automations/node-types.ts.
 *   4. Add its editor fields in src/components/automations/node-inspector.tsx.
 */

export type StepTrace = {
  nodeId: string
  label: string
  type: string
  status: 'completed' | 'failed' | 'skipped'
  output: string
  ms: number
}

const MAX_STEPS = 50 // guards against cycles in a hand-drawn graph
const MAX_DELAY_SECONDS = 10 // keep a manual run responsive
const HTTP_TIMEOUT_MS = 10_000

type NodeRecord = Prisma.AutomationNodeGetPayload<{ include: { agent: true } }>
type EdgeRecord = Prisma.AutomationConnectionGetPayload<Prisma.AutomationConnectionDefaultArgs>

/** Replaces `{{input}}` and `{{payload}}` placeholders in node configuration. */
function interpolate(template: string, payload: string): string {
  return template.replace(/\{\{\s*(input|payload)\s*\}\}/g, payload)
}

export type RunResult = {
  executionId: string
  status: 'COMPLETED' | 'FAILED'
  output: string
  error?: string
  steps: StepTrace[]
  inputTokens: number
  outputTokens: number
  costUsd: number
  durationMs: number
}

export async function runAutomation(options: {
  automationId: string
  workspaceId: string
  /** Null for runs triggered by a webhook, schedule or API key. */
  userId?: string | null
  input: string
  source: ExecutionSource
}): Promise<RunResult> {
  const automation = await prisma.automation.findFirst({
    where: { id: options.automationId, workspaceId: options.workspaceId },
    include: { nodes: { include: { agent: true } }, connections: true },
  })
  // AppError so the API layer answers 404/400 rather than a generic 500 —
  // and so a workflow from another workspace is indistinguishable from one
  // that does not exist.
  if (!automation) throw new AppError('Automation not found.', 404)
  if (automation.nodes.length === 0) {
    throw new AppError('This automation has no nodes yet. Add a trigger and at least one action.', 400)
  }

  const execution = await prisma.execution.create({
    data: {
      workspaceId: options.workspaceId,
      userId: options.userId ?? null,
      automationId: automation.id,
      status: 'RUNNING',
      source: options.source,
      input: options.input,
    },
  })

  const startedAt = Date.now()
  const steps: StepTrace[] = []
  let payload = options.input
  let inputTokens = 0
  let outputTokens = 0
  let costUsd = 0
  let lastAgentId: string | null = null

  const nodesById = new Map(automation.nodes.map((node) => [node.id, node]))
  const edgesFrom = new Map<string, EdgeRecord[]>()
  for (const edge of automation.connections) {
    const list: EdgeRecord[] = edgesFrom.get(edge.sourceId) ?? []
    list.push(edge)
    edgesFrom.set(edge.sourceId, list)
  }

  // Start at the trigger, or at the first node nothing points to.
  const targeted = new Set(automation.connections.map((edge) => edge.targetId))
  const start =
    automation.nodes.find((node) => node.type === 'TRIGGER') ??
    automation.nodes.find((node) => !targeted.has(node.id)) ??
    automation.nodes[0]

  let current: NodeRecord | undefined = start
  let branchTaken: string | null = null
  let failure: string | null = null

  try {
    for (let hop = 0; current && hop < MAX_STEPS; hop++) {
      const nodeStarted = Date.now()
      const result = await runNode(current, payload, options.workspaceId)
      payload = result.payload
      branchTaken = result.branch

      if (result.usage) {
        inputTokens += result.usage.inputTokens
        outputTokens += result.usage.outputTokens
        costUsd += result.usage.costUsd
        lastAgentId = current.agentId ?? lastAgentId
      }

      steps.push({
        nodeId: current.id,
        label: current.label,
        type: current.type,
        status: 'completed',
        output: result.payload.slice(0, 2000),
        ms: Date.now() - nodeStarted,
      })

      // Follow the matching edge. A CONDITION node picks its true/false branch.
      const outgoing: EdgeRecord[] = edgesFrom.get(current.id) ?? []
      const next =
        branchTaken === null
          ? outgoing[0]
          : outgoing.find((edge) => edge.branch === branchTaken) ??
            outgoing.find((edge) => !edge.branch)

      current = next ? nodesById.get(next.targetId) : undefined
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : 'The automation failed to complete.'
    if (current) {
      steps.push({
        nodeId: current.id,
        label: current.label,
        type: current.type,
        status: 'failed',
        output: failure,
        ms: 0,
      })
    }
  }

  const durationMs = Date.now() - startedAt
  const status = failure ? 'FAILED' : 'COMPLETED'

  await prisma.execution.update({
    where: { id: execution.id },
    data: {
      status,
      output: failure ? '' : payload,
      error: failure,
      steps: steps as unknown as Prisma.InputJsonValue,
      agentId: lastAgentId,
      inputTokens,
      outputTokens,
      costUsd,
      durationMs,
      finishedAt: new Date(),
    },
  })

  await prisma.automation.update({
    where: { id: automation.id },
    data: { lastRunAt: new Date() },
  })

  return {
    executionId: execution.id,
    status,
    output: failure ? '' : payload,
    error: failure ?? undefined,
    steps,
    inputTokens,
    outputTokens,
    costUsd,
    durationMs,
  }
}

type NodeOutcome = {
  payload: string
  /** "true"/"false" for a CONDITION node, otherwise null. */
  branch: string | null
  usage?: { inputTokens: number; outputTokens: number; costUsd: number }
}

async function runNode(node: NodeRecord, payload: string, workspaceId: string): Promise<NodeOutcome> {
  const config = (node.config ?? {}) as Record<string, unknown>
  const str = (key: string, fallback = '') =>
    typeof config[key] === 'string' ? (config[key] as string) : fallback

  switch (node.type) {
    case 'TRIGGER':
      return { payload, branch: null }

    case 'TEXT_INPUT': {
      const text = str('text')
      // An empty text node passes the incoming payload straight through.
      return { payload: text ? interpolate(text, payload) : payload, branch: null }
    }

    case 'AI_AGENT': {
      if (!node.agent) throw new Error(`Step "${node.label}" has no agent selected.`)
      if (node.agent.status === 'INACTIVE') {
        throw new Error(`The agent "${node.agent.name}" is disabled. Enable it to run this automation.`)
      }
      await assertWithinLimit(workspaceId, 'requests')

      const template = str('prompt')
      const userMessage = template ? interpolate(template, payload) : payload

      // Agents attached to a knowledge base retrieve context first (RAG).
      let systemPrompt = node.agent.systemPrompt
      if (node.agent.knowledgeBaseId) {
        const chunks = await searchKnowledgeBase({
          workspaceId,
          knowledgeBaseId: node.agent.knowledgeBaseId,
          query: userMessage || payload,
        })
        const context = buildContextBlock(chunks)
        if (context) systemPrompt = `${systemPrompt}\n\n${context}`
      }

      const completion = await runCompletion({
        workspaceId,
        provider: node.agent.provider,
        model: node.agent.model,
        temperature: node.agent.temperature,
        maxTokens: node.agent.maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage || 'Continue.' },
        ],
      })

      const costUsd = await calculateCost(
        node.agent.provider,
        node.agent.model,
        completion.inputTokens,
        completion.outputTokens,
      )

      await prisma.aiUsage.create({
        data: {
          workspaceId,
          agentId: node.agent.id,
          provider: node.agent.provider,
          model: node.agent.model,
          inputTokens: completion.inputTokens,
          outputTokens: completion.outputTokens,
          costUsd,
          latencyMs: completion.latencyMs,
          source: 'automation',
        },
      })

      return {
        payload: completion.text,
        branch: null,
        usage: { inputTokens: completion.inputTokens, outputTokens: completion.outputTokens, costUsd },
      }
    }

    case 'KNOWLEDGE_SEARCH': {
      const knowledgeBaseId = str('knowledgeBaseId')
      if (!knowledgeBaseId) throw new Error(`Step "${node.label}" has no knowledge base selected.`)

      const query = interpolate(str('query', '{{input}}'), payload)
      const limit = Math.min(Math.max(Number(config.limit ?? 5) || 5, 1), 20)

      const chunks = await searchKnowledgeBase({ workspaceId, knowledgeBaseId, query, limit })
      if (chunks.length === 0) {
        return { payload: 'No matching content was found in the knowledge base.', branch: null }
      }
      return {
        payload: chunks
          .map((chunk, index) => `[${index + 1}] ${chunk.documentName}\n${chunk.content}`)
          .join('\n\n'),
        branch: null,
      }
    }

    case 'TRANSFORM': {
      const operation = str('operation', 'template')
      switch (operation) {
        case 'json_extract': {
          // Pull one field out of a JSON payload, e.g. from an HTTP response.
          const path = str('path')
          try {
            const parsed = JSON.parse(payload)
            const value = path
              .split('.')
              .filter(Boolean)
              .reduce<unknown>(
                (accumulator, key) =>
                  accumulator && typeof accumulator === 'object'
                    ? (accumulator as Record<string, unknown>)[key]
                    : undefined,
                parsed,
              )
            if (value === undefined) {
              throw new Error(`Step "${node.label}": no value found at "${path}".`)
            }
            return {
              payload: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
              branch: null,
            }
          } catch (error) {
            if (error instanceof Error && error.message.startsWith('Step ')) throw error
            throw new Error(`Step "${node.label}": the input was not valid JSON.`)
          }
        }
        case 'regex_extract': {
          const pattern = str('pattern')
          if (!pattern) throw new Error(`Step "${node.label}" has no pattern set.`)
          try {
            const match = payload.match(new RegExp(pattern))
            // Prefer the first capture group when the pattern has one.
            return { payload: match ? (match[1] ?? match[0]) : '', branch: null }
          } catch {
            throw new Error(`Step "${node.label}": "${pattern}" is not a valid regular expression.`)
          }
        }
        case 'uppercase':
          return { payload: payload.toUpperCase(), branch: null }
        case 'lowercase':
          return { payload: payload.toLowerCase(), branch: null }
        case 'trim':
          return { payload: payload.trim(), branch: null }
        case 'truncate': {
          const length = Math.max(Number(config.length ?? 500) || 500, 1)
          return { payload: payload.slice(0, length), branch: null }
        }
        default:
          // "template" — rewrite the payload using a template string.
          return { payload: interpolate(str('template', '{{input}}'), payload), branch: null }
      }
    }

    case 'SEND_EMAIL': {
      const to = interpolate(str('to'), payload).trim()
      if (!to) throw new Error(`Step "${node.label}" has no recipient address.`)
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
        throw new Error(`Step "${node.label}": "${to}" is not a valid email address.`)
      }

      const subject = interpolate(str('subject', 'Automation result'), payload)
      const body = interpolate(str('body', '{{input}}'), payload)
      const message = automationTemplate(await brand(), subject, body)

      try {
        await sendEmailOrThrow({ to, subject: message.subject, html: message.html, text: message.text })
      } catch (error) {
        console.error('[agentflow] automation email failed:', error)
        throw new Error(
          `Step "${node.label}": the email could not be sent. Check your EMAIL_PROVIDER configuration.`,
        )
      }
      // Pass the payload through so later steps still see the content.
      return { payload, branch: null }
    }

    case 'CONDITION': {
      const operator = str('operator', 'contains')
      const value = str('value')
      const haystack = payload.toLowerCase()
      const needle = value.toLowerCase()

      let matched: boolean
      switch (operator) {
        case 'equals':
          matched = haystack.trim() === needle.trim()
          break
        case 'not_contains':
          matched = !haystack.includes(needle)
          break
        case 'longer_than':
          matched = payload.length > Number(value || 0)
          break
        case 'is_empty':
          matched = payload.trim().length === 0
          break
        default:
          matched = haystack.includes(needle)
      }
      return { payload, branch: matched ? 'true' : 'false' }
    }

    case 'HTTP_REQUEST': {
      const url = interpolate(str('url'), payload)
      const method = (str('method', 'GET') || 'GET').toUpperCase()

      // Blocks localhost / private-network targets (SSRF protection).
      const verdict = await isSafeOutboundUrl(url)
      if (!verdict.ok) throw new Error(`Step "${node.label}": ${verdict.reason}`)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS)
      try {
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/plain' },
          ...(method === 'GET' || method === 'HEAD'
            ? {}
            : { body: interpolate(str('body', '{{input}}'), payload) }),
          signal: controller.signal,
          redirect: 'error', // a redirect could point back at a private address
        })
        const text = await response.text()
        if (!response.ok) {
          throw new Error(`Step "${node.label}": the request returned HTTP ${response.status}.`)
        }
        return { payload: text.slice(0, 20_000), branch: null }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Step "${node.label}": the request timed out after 10 seconds.`)
        }
        throw error instanceof Error ? error : new Error(`Step "${node.label}" failed.`)
      } finally {
        clearTimeout(timeout)
      }
    }

    case 'DELAY': {
      const seconds = Math.min(Number(config.seconds ?? 1) || 1, MAX_DELAY_SECONDS)
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000))
      return { payload, branch: null }
    }

    case 'OUTPUT':
      return { payload, branch: null }

    default:
      return { payload, branch: null }
  }
}
