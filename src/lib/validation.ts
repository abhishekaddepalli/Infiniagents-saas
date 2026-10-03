import { z } from 'zod'

/**
 * Every API route validates its body with one of these schemas before touching
 * the database. Prisma parameterises all queries, so this layer is about shape
 * and business rules rather than SQL injection.
 */

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: passwordSchema,
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is missing'),
  password: passwordSchema,
})

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  image: z.string().trim().max(2000).optional().or(z.literal('')),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
})

export const providerEnum = z.enum(['OPENAI', 'GEMINI', 'ANTHROPIC'])

export const agentSchema = z.object({
  name: z.string().trim().min(2, 'Agent name must be at least 2 characters').max(80),
  description: z.string().trim().max(500).default(''),
  icon: z.string().trim().max(40).default('bot'),
  provider: providerEnum,
  model: z.string().trim().min(1, 'Choose a model'),
  systemPrompt: z.string().trim().min(10, 'System instructions must be at least 10 characters').max(20000),
  temperature: z.coerce.number().min(0).max(2),
  maxTokens: z.coerce.number().int().min(64).max(128000),
  welcomeMessage: z.string().trim().max(1000).default(''),
  memoryEnabled: z.boolean().default(true),
  knowledgeBaseId: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})

export const chatSchema = z.object({
  agentId: z.string().min(1),
  conversationId: z.string().optional().nullable(),
  message: z.string().trim().min(1, 'Type a message first').max(10000),
})

export const nodeSchema = z.object({
  id: z.string(),
  type: z.enum([
    'TRIGGER', 'AI_AGENT', 'CONDITION', 'TEXT_INPUT', 'HTTP_REQUEST', 'DELAY',
    'OUTPUT', 'TRANSFORM', 'KNOWLEDGE_SEARCH', 'SEND_EMAIL',
  ]),
  label: z.string().trim().min(1).max(80),
  config: z.record(z.any()).default({}),
  positionX: z.number(),
  positionY: z.number(),
  agentId: z.string().nullable().optional(),
})

export const connectionSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  branch: z.string().nullable().optional(),
})

export const automationSchema = z.object({
  name: z.string().trim().min(2, 'Automation name must be at least 2 characters').max(80),
  description: z.string().trim().max(500).default(''),
  triggerType: z.enum(['MANUAL', 'WEBHOOK', 'SCHEDULE']).default('MANUAL'),
  schedule: z.string().trim().max(120).nullable().optional(),
  timezone: z.string().trim().max(60).default('UTC'),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED']).default('DRAFT'),
  nodes: z.array(nodeSchema).max(50, 'An automation can hold at most 50 nodes'),
  connections: z.array(connectionSchema).max(100),
})

export const aiModelSchema = z.object({
  provider: providerEnum,
  name: z.string().trim().min(1).max(80),
  modelId: z.string().trim().min(1).max(120),
  inputCostPerM: z.coerce.number().min(0),
  outputCostPerM: z.coerce.number().min(0),
  maxTokens: z.coerce.number().int().min(1),
  enabled: z.boolean().default(true),
})

export const templateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(5).max(500),
  category: z.string().trim().min(2).max(50),
  icon: z.string().trim().max(40).default('sparkles'),
  systemPrompt: z.string().trim().min(10).max(20000),
  provider: providerEnum,
  model: z.string().trim().min(1),
  temperature: z.coerce.number().min(0).max(2),
  maxTokens: z.coerce.number().int().min(64).max(128000),
  welcomeMessage: z.string().trim().max(1000).default(''),
  status: z.enum(['PUBLISHED', 'DRAFT']).default('PUBLISHED'),
  featured: z.boolean().default(false),
})

export const planSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).default(''),
  priceMonthly: z.coerce.number().min(0),
  priceYearly: z.coerce.number().min(0),
  maxAgents: z.coerce.number().int().min(-1),
  maxRequests: z.coerce.number().int().min(-1),
  maxAutomations: z.coerce.number().int().min(-1),
  maxMembers: z.coerce.number().int().min(-1),
  maxDocuments: z.coerce.number().int().min(-1),
  stripePriceMonthlyId: z.string().trim().max(120).nullable().optional(),
  stripePriceYearlyId: z.string().trim().max(120).nullable().optional(),
  razorpayPlanMonthlyId: z.string().trim().max(120).nullable().optional(),
  razorpayPlanYearlyId: z.string().trim().max(120).nullable().optional(),
  features: z.array(z.string().max(120)).max(20).default([]),
  highlighted: z.boolean().default(false),
  active: z.boolean().default(true),
})

export const providerKeySchema = z.object({
  provider: providerEnum,
  apiKey: z.string().trim().min(8, 'That key looks too short').max(400),
})

// --------------------------- workspaces ------------------------------------

export const workspaceRoleEnum = z.enum(['OWNER', 'ADMIN', 'MEMBER'])

export const workspaceSchema = z.object({
  name: z.string().trim().min(2, 'Workspace name must be at least 2 characters').max(60),
  image: z.string().trim().max(2000).optional().or(z.literal('')),
})

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  role: workspaceRoleEnum.exclude(['OWNER']).default('MEMBER'),
})

export const memberRoleSchema = z.object({ role: workspaceRoleEnum })

// ------------------------- knowledge base ----------------------------------

export const knowledgeBaseSchema = z.object({
  name: z.string().trim().min(2, 'Give the knowledge base a name').max(80),
  description: z.string().trim().max(500).default(''),
  embeddingProvider: z.enum(['OPENAI', 'GEMINI']).default('OPENAI'),
  embeddingModel: z.string().trim().min(1).max(120),
})

export const knowledgeTextSchema = z.object({
  name: z.string().trim().min(1, 'Give this document a name').max(160),
  content: z.string().trim().min(20, 'Add at least 20 characters of content').max(500_000),
})

export const knowledgeQuerySchema = z.object({
  query: z.string().trim().min(1, 'Enter something to search for').max(2000),
  limit: z.coerce.number().int().min(1).max(20).default(5),
})

// ----------------------------- API keys ------------------------------------

export const API_SCOPES = [
  'agents:read',
  'agents:write',
  'chat:write',
  'automations:read',
  'automations:run',
  'executions:read',
  'knowledge:read',
] as const

export const apiKeySchema = z.object({
  name: z.string().trim().min(2, 'Name this key so you can recognise it later').max(60),
  scopes: z.array(z.enum(API_SCOPES)).min(1, 'Select at least one scope'),
  expiresInDays: z.coerce.number().int().min(0).max(3650).default(0),
})

// ------------------------------ billing ------------------------------------

export const checkoutSchema = z.object({
  planSlug: z.string().min(1),
  interval: z.enum(['monthly', 'yearly']).default('monthly'),
  gateway: z.enum(['stripe', 'razorpay', 'none']).default('none'),
})

// ------------------------- public API (v1) ---------------------------------

export const apiChatSchema = z.object({
  message: z.string().trim().min(1, 'message is required').max(20000),
  conversationId: z.string().optional().nullable(),
  stream: z.boolean().optional().default(false),
})

export const apiRunSchema = z.object({
  input: z.string().max(20000).default(''),
})
