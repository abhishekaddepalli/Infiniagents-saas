/**
 * AgentFlow AI — database seed.
 *
 *   npm run db:seed
 *
 * Creates the admin account, a demo user, and a set of realistic sample data
 * (agents, automations, executions, usage) so the product is immediately
 * explorable after installation.
 *
 * Everything marked `isDemo: true` is sample content. Delete it from the admin
 * panel, or run this file after emptying the arrays below, to start clean.
 *
 * The seed is idempotent — running it twice will not duplicate data.
 */
import 'dotenv/config'
import { Agent, Provider, PrismaClient, Workspace } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { agentTemplates } from './seed-data/templates'
import { aiModels } from './seed-data/models'
import { plans } from './seed-data/plans'
import { prompts } from './seed-data/prompts'
import { DEFAULT_SETTINGS } from '../src/lib/settings-defaults'
import { chunkText } from '../src/lib/knowledge/chunk'
import { localEmbed, LOCAL_EMBEDDING_MODEL } from '../src/lib/knowledge/local-embed'
import { handbook as HANDBOOK } from './seed-data/handbook'
import { createHash } from 'crypto'

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

const prisma = new PrismaClient()

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@agentflow.ai'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345'
const USER_EMAIL = process.env.SEED_USER_EMAIL || 'demo@agentflow.ai'
const USER_PASSWORD = process.env.SEED_USER_PASSWORD || 'Demo@12345'
const TEAMMATE_EMAIL = process.env.SEED_TEAMMATE_EMAIL || 'sam@agentflow.ai'
const TEAMMATE_PASSWORD = process.env.SEED_TEAMMATE_PASSWORD || 'Demo@12345'

// ---------------------------------------------------------------------------
// Sample agents for the demo account
// ---------------------------------------------------------------------------
const demoAgents = [
  {
    name: 'Customer Support Agent',
    icon: 'headphones',
    description: 'Front-line support for billing, onboarding, and account questions.',
    provider: 'OPENAI' as Provider,
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1024,
    welcomeMessage: 'Hi! How can I help you today?',
    systemPrompt:
      'You are a friendly, precise customer support agent. Resolve the issue in as few messages as possible, ask at most one clarifying question, and escalate honestly when you cannot help. Never invent policy or pricing.',
  },
  {
    name: 'Sales Assistant',
    icon: 'trending-up',
    description: 'Drafts discovery questions, handles objections, and writes follow-ups.',
    provider: 'OPENAI' as Provider,
    model: 'gpt-4o-mini',
    temperature: 0.6,
    maxTokens: 1200,
    welcomeMessage: 'Tell me about the prospect and I will suggest how to respond.',
    systemPrompt:
      'You are a B2B sales assistant. Prefer questions over pitching. Acknowledge objections before reframing them around outcomes. Never invent case studies, customer names, or pricing — use {{placeholders}}.',
  },
  {
    name: 'Content Writer',
    icon: 'pen-line',
    description: 'Long-form articles and landing page copy in a clear, plain voice.',
    provider: 'ANTHROPIC' as Provider,
    model: 'claude-sonnet-4-5',
    temperature: 0.8,
    maxTokens: 2048,
    welcomeMessage: 'What should I write about?',
    systemPrompt:
      'You are a content writer. Write at an 8th-grade reading level in the active voice. Vary sentence length. Ban filler transitions and hype adjectives. Every section needs a concrete example.',
  },
  {
    name: 'Research Assistant',
    icon: 'microscope',
    description: 'Structured answers with explicit confidence levels and caveats.',
    provider: 'ANTHROPIC' as Provider,
    model: 'claude-haiku-4-5-20251001',
    temperature: 0.4,
    maxTokens: 2048,
    welcomeMessage: 'What would you like me to look into?',
    systemPrompt:
      'You are a research assistant. Always separate what is well established from what is contested or inferred. State your confidence and what evidence would change your answer. Never fabricate citations or statistics.',
  },
  {
    name: 'Email Writer',
    icon: 'mail',
    description: 'Short, specific emails that actually get replies.',
    provider: 'GEMINI' as Provider,
    model: 'gemini-2.0-flash',
    temperature: 0.6,
    maxTokens: 800,
    welcomeMessage: 'Who is the email for, and what do you need it to achieve?',
    systemPrompt:
      'You write emails that get replies. Lead with the reason for writing. Under 150 words. One clear ask on its own line. Use {{placeholders}} instead of inventing names or dates.',
  },
  {
    name: 'Data Analyzer',
    icon: 'database',
    description: 'Reads tabular data and reports the patterns worth acting on.',
    provider: 'OPENAI' as Provider,
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 2048,
    welcomeMessage: 'Paste your data or describe the dataset.',
    systemPrompt:
      'You analyse datasets. Report the pattern, its size, and your confidence. Separate correlation from causation explicitly. Never invent figures that are not in the data provided.',
  },
  {
    name: 'SEO Assistant',
    icon: 'search',
    description: 'Keyword briefs, title tags, and meta descriptions.',
    provider: 'GEMINI' as Provider,
    model: 'gemini-2.5-flash',
    temperature: 0.5,
    maxTokens: 1500,
    welcomeMessage: 'Give me a keyword or page topic to build a brief for.',
    systemPrompt:
      'You are an SEO content strategist. Return keyword clusters, search intent, a title tag under 60 characters, a meta description of 140-155 characters, and a heading outline. Never claim live search volume data.',
  },
]

function daysAgo(days: number, hour = 10) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, Math.floor(Math.random() * 60), 0, 0)
  return date
}

async function main() {
  console.log('→ Seeding AgentFlow AI\n')

  // --- Settings -----------------------------------------------------------
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: {} })
  }
  console.log('  ✓ Application settings')

  // --- Plans --------------------------------------------------------------
  for (const plan of plans) {
    await prisma.plan.upsert({ where: { slug: plan.slug }, create: plan, update: plan })
  }
  console.log(`  ✓ ${plans.length} plans`)

  // --- AI models ----------------------------------------------------------
  for (const model of aiModels) {
    await prisma.aiModel.upsert({
      where: { provider_modelId: { provider: model.provider, modelId: model.modelId } },
      create: model,
      update: { inputCostPerM: model.inputCostPerM, outputCostPerM: model.outputCostPerM },
    })
  }
  console.log(`  ✓ ${aiModels.length} AI models`)

  // --- Agent templates ----------------------------------------------------
  for (const template of agentTemplates) {
    await prisma.agentTemplate.upsert({
      where: { slug: template.slug },
      create: { ...template, provider: 'OPENAI', status: 'PUBLISHED' },
      update: { description: template.description, systemPrompt: template.systemPrompt },
    })
  }
  console.log(`  ✓ ${agentTemplates.length} agent templates`)

  // --- Prompt library -----------------------------------------------------
  if ((await prisma.prompt.count()) === 0) {
    await prisma.prompt.createMany({ data: prompts })
  }
  console.log(`  ✓ ${prompts.length} library prompts`)

  // --- Accounts & workspaces ----------------------------------------------
  const freePlan = await prisma.plan.findUniqueOrThrow({ where: { slug: 'free' } })
  const proPlan = await prisma.plan.findUniqueOrThrow({ where: { slug: 'pro' } })

  /** Creates a workspace with its owner membership and a subscription. */
  async function ensureWorkspace(options: {
    name: string
    slug: string
    ownerId: string
    planId: string
    isPersonal: boolean
  }): Promise<Workspace> {
    const existing = await prisma.workspace.findUnique({ where: { slug: options.slug } })
    if (existing) return existing

    return prisma.workspace.create({
      data: {
        name: options.name,
        slug: options.slug,
        ownerId: options.ownerId,
        isPersonal: options.isPersonal,
        isDemo: true,
        members: { create: { userId: options.ownerId, role: 'OWNER' } },
        subscription: { create: { planId: options.planId } },
      },
    })
  }

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      name: 'Admin',
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: 'ADMIN',
    },
    update: { role: 'ADMIN' },
  })

  const demoUser = await prisma.user.upsert({
    where: { email: USER_EMAIL },
    create: {
      name: 'Demo User',
      email: USER_EMAIL,
      passwordHash: await bcrypt.hash(USER_PASSWORD, 12),
      role: 'USER',
      isDemo: true,
      emailVerifiedAt: new Date(),
    },
    update: {},
  })

  // A second teammate makes the members screen meaningful out of the box.
  const teammate = await prisma.user.upsert({
    where: { email: TEAMMATE_EMAIL },
    create: {
      name: 'Sam Rivera',
      email: TEAMMATE_EMAIL,
      passwordHash: await bcrypt.hash(TEAMMATE_PASSWORD, 12),
      role: 'USER',
      isDemo: true,
      emailVerifiedAt: new Date(),
    },
    update: {},
  })

  const adminWorkspace = await ensureWorkspace({
    name: 'Admin Workspace',
    slug: 'admin-workspace',
    ownerId: admin.id,
    planId: freePlan.id,
    isPersonal: true,
  })
  // The demo workspace is a *team* workspace, so collaboration is visible.
  const workspace = await ensureWorkspace({
    name: 'Acme AI Team',
    slug: 'acme-ai-team',
    ownerId: demoUser.id,
    planId: proPlan.id,
    isPersonal: false,
  })

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: teammate.id } },
    create: { workspaceId: workspace.id, userId: teammate.id, role: 'ADMIN' },
    update: {},
  })

  await prisma.user.update({
    where: { id: demoUser.id },
    data: { lastWorkspaceId: workspace.id, onboardedAt: new Date() },
  })
  await prisma.user.update({
    where: { id: admin.id },
    data: { lastWorkspaceId: adminWorkspace.id, onboardedAt: new Date() },
  })

  console.log(`  ✓ Accounts: ${ADMIN_EMAIL} (admin), ${USER_EMAIL} (demo), ${TEAMMATE_EMAIL} (teammate)`)
  console.log(`  ✓ Workspaces: "Acme AI Team" (2 members), "Admin Workspace"`)

  // --- Demo agents --------------------------------------------------------
  if ((await prisma.agent.count({ where: { workspaceId: workspace.id } })) > 0) {
    console.log('\n  Demo content already present — skipping sample data.\n')
    return
  }

  const agents: Agent[] = []
  for (const agent of demoAgents) {
    agents.push(
      await prisma.agent.create({
        data: {
          ...agent,
          workspaceId: workspace.id,
          createdById: demoUser.id,
          isDemo: true,
          status: 'ACTIVE',
          memoryEnabled: true,
        },
      }),
    )
  }
  /*
   * "Data Analyzer" ships disabled so the status filter and the disabled-agent
   * empty states are visible in the demo. It is deliberately not referenced by
   * any demo automation, so every sample workflow still runs out of the box.
   */
  const disabledAgent = agents.find((agent) => agent.name === 'Data Analyzer')
  if (disabledAgent) {
    await prisma.agent.update({ where: { id: disabledAgent.id }, data: { status: 'INACTIVE' } })
  }
  console.log(`  ✓ ${agents.length} demo agents`)

  const byName = (name: string) => {
    const agent = agents.find((item) => item.name === name)
    if (!agent) throw new Error(`Demo agent "${name}" was not created.`)
    return agent
  }
  const support = byName('Customer Support Agent')
  const sales = byName('Sales Assistant')
  const writer = byName('Content Writer')
  const research = byName('Research Assistant')
  const emailer = byName('Email Writer')
  const seo = byName('SEO Assistant')

  // --- Demo automations ---------------------------------------------------
  // Each entry is a small graph: nodes laid out left-to-right, plus the edges.
  const automationBlueprints = [
    {
      name: 'Support Ticket Triage',
      description: 'Classifies an incoming ticket, then drafts either a reply or an escalation summary.',
      triggerType: 'WEBHOOK' as const,
      status: 'ACTIVE' as const,
      nodes: [
        { key: 'trigger', type: 'TRIGGER' as const, label: 'Ticket received', x: 40, y: 180, config: {} },
        { key: 'classify', type: 'AI_AGENT' as const, label: 'Classify urgency', x: 300, y: 180, agent: support.id, config: { prompt: 'Classify this support ticket as URGENT or NORMAL, then explain in one line.\n\n{{input}}' } },
        { key: 'cond', type: 'CONDITION' as const, label: 'Is it urgent?', x: 560, y: 180, config: { operator: 'contains', value: 'URGENT' } },
        { key: 'escalate', type: 'AI_AGENT' as const, label: 'Draft escalation', x: 820, y: 80, agent: research.id, config: { prompt: 'Write a concise escalation summary for an engineer:\n\n{{input}}' } },
        { key: 'reply', type: 'AI_AGENT' as const, label: 'Draft reply', x: 820, y: 290, agent: support.id, config: { prompt: 'Write a friendly support reply resolving this ticket:\n\n{{input}}' } },
        { key: 'out', type: 'OUTPUT' as const, label: 'Send response', x: 1080, y: 180, config: {} },
      ],
      edges: [
        ['trigger', 'classify', null],
        ['classify', 'cond', null],
        ['cond', 'escalate', 'true'],
        ['cond', 'reply', 'false'],
        ['escalate', 'out', null],
        ['reply', 'out', null],
      ],
    },
    {
      name: 'Blog Post Pipeline',
      description: 'Turns a topic into a drafted article with an SEO brief attached.',
      triggerType: 'MANUAL' as const,
      status: 'ACTIVE' as const,
      nodes: [
        { key: 'trigger', type: 'TRIGGER' as const, label: 'Manual start', x: 40, y: 180, config: {} },
        { key: 'topic', type: 'TEXT_INPUT' as const, label: 'Topic', x: 300, y: 180, config: { text: 'Write about: {{input}}' } },
        { key: 'brief', type: 'AI_AGENT' as const, label: 'SEO brief', x: 560, y: 180, agent: seo.id, config: { prompt: 'Build an SEO brief for:\n\n{{input}}' } },
        { key: 'draft', type: 'AI_AGENT' as const, label: 'Write the draft', x: 820, y: 180, agent: writer.id, config: { prompt: 'Write the full article using this brief:\n\n{{input}}' } },
        { key: 'out', type: 'OUTPUT' as const, label: 'Publish draft', x: 1080, y: 180, config: {} },
      ],
      edges: [
        ['trigger', 'topic', null],
        ['topic', 'brief', null],
        ['brief', 'draft', null],
        ['draft', 'out', null],
      ],
    },
    {
      name: 'Lead Qualification Flow',
      description: 'Scores an inbound lead and drafts the matching follow-up email.',
      triggerType: 'WEBHOOK' as const,
      status: 'ACTIVE' as const,
      nodes: [
        { key: 'trigger', type: 'TRIGGER' as const, label: 'Form submitted', x: 40, y: 180, config: {} },
        { key: 'score', type: 'AI_AGENT' as const, label: 'Score the lead', x: 300, y: 180, agent: sales.id, config: { prompt: 'Qualify this lead. Return Score, Tier and Reasoning.\n\n{{input}}' } },
        { key: 'cond', type: 'CONDITION' as const, label: 'Hot lead?', x: 560, y: 180, config: { operator: 'contains', value: 'Hot' } },
        { key: 'email', type: 'AI_AGENT' as const, label: 'Personal follow-up', x: 820, y: 80, agent: emailer.id, config: { prompt: 'Write a personal, specific follow-up email for this qualified lead:\n\n{{input}}' } },
        { key: 'nurture', type: 'AI_AGENT' as const, label: 'Nurture email', x: 820, y: 290, agent: emailer.id, config: { prompt: 'Write a light-touch nurture email for this early-stage lead:\n\n{{input}}' } },
        { key: 'out', type: 'OUTPUT' as const, label: 'Queue email', x: 1080, y: 180, config: {} },
      ],
      edges: [
        ['trigger', 'score', null],
        ['score', 'cond', null],
        ['cond', 'email', 'true'],
        ['cond', 'nurture', 'false'],
        ['email', 'out', null],
        ['nurture', 'out', null],
      ],
    },
    {
      name: 'Weekly Content Digest',
      description: 'Fetches a feed on a schedule and summarises it for the team.',
      triggerType: 'SCHEDULE' as const,
      status: 'PAUSED' as const,
      schedule: '0 9 * * 1',
      nodes: [
        { key: 'trigger', type: 'TRIGGER' as const, label: 'Every Monday 9am', x: 40, y: 180, config: {} },
        { key: 'fetch', type: 'HTTP_REQUEST' as const, label: 'Fetch feed', x: 300, y: 180, config: { method: 'GET', url: 'https://example.com/api/posts' } },
        { key: 'summarise', type: 'AI_AGENT' as const, label: 'Summarise', x: 560, y: 180, agent: research.id, config: { prompt: 'Summarise these posts into a short team digest:\n\n{{input}}' } },
        { key: 'out', type: 'OUTPUT' as const, label: 'Send digest', x: 820, y: 180, config: {} },
      ],
      edges: [
        ['trigger', 'fetch', null],
        ['fetch', 'summarise', null],
        ['summarise', 'out', null],
      ],
    },
    {
      name: 'Product Launch Copy',
      description: 'Generates launch copy, pauses briefly, then adapts it for social.',
      triggerType: 'MANUAL' as const,
      status: 'DRAFT' as const,
      nodes: [
        { key: 'trigger', type: 'TRIGGER' as const, label: 'Manual start', x: 40, y: 180, config: {} },
        { key: 'copy', type: 'AI_AGENT' as const, label: 'Launch copy', x: 300, y: 180, agent: writer.id, config: { prompt: 'Write launch announcement copy for:\n\n{{input}}' } },
        { key: 'wait', type: 'DELAY' as const, label: 'Wait 2s', x: 560, y: 180, config: { seconds: 2 } },
        { key: 'social', type: 'AI_AGENT' as const, label: 'Social variants', x: 820, y: 180, agent: writer.id, config: { prompt: 'Adapt this into LinkedIn, X and Instagram posts:\n\n{{input}}' } },
        { key: 'out', type: 'OUTPUT' as const, label: 'Copy pack', x: 1080, y: 180, config: {} },
      ],
      edges: [
        ['trigger', 'copy', null],
        ['copy', 'wait', null],
        ['wait', 'social', null],
        ['social', 'out', null],
      ],
    },
  ]

  const createdAutomations = []
  for (const blueprint of automationBlueprints) {
    const automation = await prisma.automation.create({
      data: {
        workspaceId: workspace.id,
        name: blueprint.name,
        description: blueprint.description,
        triggerType: blueprint.triggerType,
        status: blueprint.status,
        schedule: 'schedule' in blueprint ? (blueprint.schedule as string) : null,
        webhookKey: blueprint.triggerType === 'WEBHOOK' ? cryptoKey() : null,
        isDemo: true,
      },
    })

    const idByKey = new Map<string, string>()
    for (const node of blueprint.nodes) {
      const created = await prisma.automationNode.create({
        data: {
          automationId: automation.id,
          type: node.type,
          label: node.label,
          config: node.config,
          positionX: node.x,
          positionY: node.y,
          agentId: 'agent' in node ? (node.agent as string) : null,
        },
      })
      idByKey.set(node.key, created.id)
    }
    for (const [from, to, branch] of blueprint.edges) {
      await prisma.automationConnection.create({
        data: {
          automationId: automation.id,
          sourceId: idByKey.get(from as string)!,
          targetId: idByKey.get(to as string)!,
          branch: branch as string | null,
        },
      })
    }
    createdAutomations.push(automation)
  }
  console.log(`  ✓ ${createdAutomations.length} demo automations`)

  // --- Demo knowledge base -------------------------------------------------
  // Indexed with the local lexical embedder so retrieval works with no API
  // key. Re-upload the document after adding a real provider key to get
  // proper semantic embeddings.
  const knowledgeBase = await prisma.knowledgeBase.create({
    data: {
      workspaceId: workspace.id,
      name: 'Product Handbook',
      description: 'Policies and product facts the support agent answers from.',
      embeddingProvider: 'OPENAI',
      embeddingModel: LOCAL_EMBEDDING_MODEL,
      isDemo: true,
    },
  })

  const handbookDocument = await prisma.document.create({
    data: {
      knowledgeBaseId: knowledgeBase.id,
      name: 'Support Handbook.md',
      mimeType: 'text/markdown',
      sizeBytes: Buffer.byteLength(HANDBOOK, 'utf8'),
      status: 'PENDING',
    },
  })

  const handbookChunks = chunkText(HANDBOOK)
  await prisma.documentChunk.createMany({
    data: handbookChunks.map((chunk) => ({
      documentId: handbookDocument.id,
      knowledgeBaseId: knowledgeBase.id,
      index: chunk.index,
      content: chunk.content,
      embedding: localEmbed(chunk.content),
      tokens: chunk.tokens,
    })),
  })
  await prisma.document.update({
    where: { id: handbookDocument.id },
    data: { status: 'READY', chunkCount: handbookChunks.length },
  })

  // Point the support agent at it so RAG is demonstrable immediately.
  await prisma.agent.update({
    where: { id: support.id },
    data: { knowledgeBaseId: knowledgeBase.id },
  })
  console.log(`  ✓ Knowledge base with ${handbookChunks.length} indexed chunks`)

  // --- API key -------------------------------------------------------------
  await prisma.apiKey.create({
    data: {
      workspaceId: workspace.id,
      createdById: demoUser.id,
      name: 'Demo integration key',
      // Hash of a key that is never revealed — the row exists so the API keys
      // screen is not empty. Create a real key from the UI to actually call
      // the API.
      keyHash: sha256(`af_test_${Math.random().toString(36).slice(2)}${Date.now()}`),
      keyPrefix: 'af_test_demo01',
      scopes: ['agents:read', 'chat:write', 'automations:read', 'automations:run'],
    },
  })

  // --- Execution history & usage -----------------------------------------
  const sampleRuns = [
    { input: 'My invoice shows a charge I do not recognise for last month.', output: 'Thanks for flagging this. The charge is the annual plan renewal processed on the 3rd. I have attached the invoice breakdown and can switch you to monthly billing if you prefer.', status: 'COMPLETED' as const },
    { input: 'Write a post about reducing onboarding drop-off.', output: '# Where New Users Actually Quit\n\nMost onboarding funnels lose people at the third step, not the first...', status: 'COMPLETED' as const },
    { input: 'New lead: VP Engineering, 200-person fintech, asked about SOC 2.', output: 'Score: 82\nTier: Hot\nReasoning: Senior decision-maker, compliance question signals an active evaluation.', status: 'COMPLETED' as const },
    { input: 'Keyword: ai workflow automation for small teams', output: 'Primary keyword: ai workflow automation. Intent: commercial investigation. Title tag: AI Workflow Automation for Small Teams (54 chars)...', status: 'COMPLETED' as const },
    { input: 'Summarise the Q3 planning call transcript.', output: 'In one sentence: the team agreed to delay the billing rewrite to Q4 in favour of onboarding work...', status: 'COMPLETED' as const },
    { input: 'Fetch the latest posts and summarise them.', output: '', status: 'FAILED' as const, error: 'Step "Fetch feed": the request returned HTTP 404.' },
    { input: 'Draft a follow-up for the demo call with Northwind.', output: 'Subject: The reporting piece you asked about\n\nHi {{name}}, you mentioned reporting was the sticking point...', status: 'COMPLETED' as const },
    { input: 'Customer says the export button does nothing on Safari.', output: 'Thanks for the detail — that helps. This is a known issue with Safari 17 and our team has a fix in review...', status: 'COMPLETED' as const },
  ]

  let executionCount = 0
  for (let day = 0; day < 14; day++) {
    const runsToday = day < 7 ? 2 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2)
    for (let i = 0; i < runsToday; i++) {
      const sample = sampleRuns[executionCount % sampleRuns.length]
      const automation = createdAutomations[executionCount % createdAutomations.length]
      const agent = agents[executionCount % agents.length]
      const startedAt = daysAgo(day, 9 + (i % 9))
      const inputTokens = 220 + Math.floor(Math.random() * 900)
      const outputTokens = 140 + Math.floor(Math.random() * 700)
      const durationMs = 900 + Math.floor(Math.random() * 5200)

      const modelRow = await prisma.aiModel.findFirst({
        where: { provider: agent.provider, modelId: agent.model },
      })
      const costUsd = modelRow
        ? Math.round(((inputTokens / 1e6) * modelRow.inputCostPerM + (outputTokens / 1e6) * modelRow.outputCostPerM) * 1e6) / 1e6
        : 0

      await prisma.execution.create({
        data: {
          workspaceId: workspace.id,
          userId: demoUser.id,
          automationId: automation.id,
          agentId: agent.id,
          status: sample.status,
          source: automation.triggerType === 'WEBHOOK' ? 'WEBHOOK' : 'MANUAL',
          input: sample.input,
          output: sample.output,
          error: 'error' in sample ? (sample.error as string) : null,
          steps: [
            { nodeId: 'demo-1', label: 'Trigger', type: 'TRIGGER', status: 'completed', output: sample.input, ms: 2 },
            { nodeId: 'demo-2', label: 'AI Agent', type: 'AI_AGENT', status: sample.status === 'FAILED' ? 'failed' : 'completed', output: sample.output || (('error' in sample && sample.error) as string) || '', ms: durationMs - 60 },
            { nodeId: 'demo-3', label: 'Output', type: 'OUTPUT', status: sample.status === 'FAILED' ? 'skipped' : 'completed', output: sample.output, ms: 3 },
          ],
          inputTokens: sample.status === 'FAILED' ? 0 : inputTokens,
          outputTokens: sample.status === 'FAILED' ? 0 : outputTokens,
          costUsd: sample.status === 'FAILED' ? 0 : costUsd,
          durationMs,
          startedAt,
          finishedAt: new Date(startedAt.getTime() + durationMs),
        },
      })

      if (sample.status !== 'FAILED') {
        await prisma.aiUsage.create({
          data: {
            workspaceId: workspace.id,
            userId: demoUser.id,
            agentId: agent.id,
            provider: agent.provider,
            model: agent.model,
            inputTokens,
            outputTokens,
            costUsd,
            latencyMs: durationMs,
            source: 'automation',
            createdAt: startedAt,
          },
        })
      }
      executionCount++
    }

    // A few playground conversations so the Usage page has mixed sources.
    if (day % 2 === 0) {
      const agent = agents[day % agents.length]
      const inputTokens = 120 + Math.floor(Math.random() * 400)
      const outputTokens = 90 + Math.floor(Math.random() * 400)
      const modelRow = await prisma.aiModel.findFirst({
        where: { provider: agent.provider, modelId: agent.model },
      })
      await prisma.aiUsage.create({
        data: {
          workspaceId: workspace.id,
          userId: demoUser.id,
          agentId: agent.id,
          provider: agent.provider,
          model: agent.model,
          inputTokens,
          outputTokens,
          costUsd: modelRow
            ? Math.round(((inputTokens / 1e6) * modelRow.inputCostPerM + (outputTokens / 1e6) * modelRow.outputCostPerM) * 1e6) / 1e6
            : 0,
          latencyMs: 700 + Math.floor(Math.random() * 2000),
          source: 'playground',
          createdAt: daysAgo(day, 15),
        },
      })
    }
  }
  console.log(`  ✓ ${executionCount} demo executions with usage history`)

  // --- A sample conversation in the playground ---------------------------
  const conversation = await prisma.conversation.create({
    data: {
      workspaceId: workspace.id,
      userId: demoUser.id,
      agentId: support.id,
      title: 'Billing question',
    },
  })
  await prisma.message.createMany({
    data: [
      { conversationId: conversation.id, role: 'user', content: 'Hi, I was charged twice this month. Can you check?', createdAt: daysAgo(1, 11) },
      {
        conversationId: conversation.id,
        role: 'assistant',
        content:
          'Sorry about that — let me take a look.\n\nI can see two charges on the account: the monthly renewal on the 1st, and a prorated charge on the 4th from your upgrade to the Pro plan. The second one covers the difference for the rest of the billing period, so it is not a duplicate.\n\nIf the upgrade was not intentional I can reverse it and refund the prorated amount. Would you like me to do that?',
        inputTokens: 310,
        outputTokens: 188,
        costUsd: 0.000159,
        latencyMs: 1840,
        createdAt: daysAgo(1, 11),
      },
    ],
  })
  console.log('  ✓ Sample playground conversation')

  console.log('\n✓ Seed complete.\n')
  console.log('  Admin:  ' + ADMIN_EMAIL + '  /  ' + ADMIN_PASSWORD)
  console.log('  Demo:   ' + USER_EMAIL + '  /  ' + USER_PASSWORD)
  console.log('\n  Change these credentials before deploying to production.\n')
}

/** Short random key used for demo webhook URLs. */
function cryptoKey() {
  return [...Array(24)].map(() => Math.floor(Math.random() * 36).toString(36)).join('')
}

main()
  .catch((error) => {
    console.error('\nSeed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
