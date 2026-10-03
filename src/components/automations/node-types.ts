import { Bot, BookOpen, Clock, GitBranch, Globe, Mail, Send, Type, Wand2, Zap } from 'lucide-react'

/**
 * The node catalog.
 *
 * Adding a node type means: an entry here, a `case` in the execution engine
 * (src/lib/automation/engine.ts), the matching fields in the node inspector,
 * and the value added to the NodeType enum in the Prisma schema.
 */
export type NodeTypeId =
  | 'TRIGGER'
  | 'AI_AGENT'
  | 'CONDITION'
  | 'TEXT_INPUT'
  | 'HTTP_REQUEST'
  | 'DELAY'
  | 'OUTPUT'
  | 'TRANSFORM'
  | 'KNOWLEDGE_SEARCH'
  | 'SEND_EMAIL'

export type NodeTypeMeta = {
  id: NodeTypeId
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  /** Tailwind classes for the node's icon chip. */
  accent: string
  /** A CONDITION node has two outputs; TRIGGER has no input; OUTPUT has none. */
  hasInput: boolean
  hasOutput: boolean
  branching: boolean
  defaultConfig: Record<string, unknown>
}

export const NODE_TYPES: Record<NodeTypeId, NodeTypeMeta> = {
  TRIGGER: {
    id: 'TRIGGER',
    label: 'Trigger',
    description: 'Where the workflow starts.',
    icon: Zap,
    accent: 'bg-brand-500/10 text-brand-600 dark:text-brand-300',
    hasInput: false,
    hasOutput: true,
    branching: false,
    defaultConfig: {},
  },
  TEXT_INPUT: {
    id: 'TEXT_INPUT',
    label: 'Text Input',
    description: 'Set or reshape the text passed to the next step.',
    icon: Type,
    accent: 'bg-elevated text-muted',
    hasInput: true,
    hasOutput: true,
    branching: false,
    defaultConfig: { text: '{{input}}' },
  },
  AI_AGENT: {
    id: 'AI_AGENT',
    label: 'AI Agent',
    description: 'Send the payload to one of your agents.',
    icon: Bot,
    accent: 'bg-brand-500/10 text-brand-600 dark:text-brand-300',
    hasInput: true,
    hasOutput: true,
    branching: false,
    defaultConfig: { prompt: '{{input}}' },
  },
  CONDITION: {
    id: 'CONDITION',
    label: 'Condition',
    description: 'Branch on what the previous step returned.',
    icon: GitBranch,
    accent: 'bg-warn/10 text-warn',
    hasInput: true,
    hasOutput: true,
    branching: true,
    defaultConfig: { operator: 'contains', value: '' },
  },
  HTTP_REQUEST: {
    id: 'HTTP_REQUEST',
    label: 'HTTP Request',
    description: 'Call an external API and pass the response on.',
    icon: Globe,
    accent: 'bg-elevated text-muted',
    hasInput: true,
    hasOutput: true,
    branching: false,
    defaultConfig: { method: 'GET', url: '', body: '{{input}}' },
  },
  DELAY: {
    id: 'DELAY',
    label: 'Delay',
    description: 'Pause before continuing.',
    icon: Clock,
    accent: 'bg-elevated text-muted',
    hasInput: true,
    hasOutput: true,
    branching: false,
    defaultConfig: { seconds: 1 },
  },
  KNOWLEDGE_SEARCH: {
    id: 'KNOWLEDGE_SEARCH',
    label: 'Knowledge Search',
    description: 'Look up matching content in a knowledge base.',
    icon: BookOpen,
    accent: 'bg-brand-500/10 text-brand-600 dark:text-brand-300',
    hasInput: true,
    hasOutput: true,
    branching: false,
    defaultConfig: { knowledgeBaseId: '', query: '{{input}}', limit: 5 },
  },
  TRANSFORM: {
    id: 'TRANSFORM',
    label: 'Transform',
    description: 'Reshape the text: extract JSON, match a pattern, trim.',
    icon: Wand2,
    accent: 'bg-elevated text-muted',
    hasInput: true,
    hasOutput: true,
    branching: false,
    defaultConfig: { operation: 'template', template: '{{input}}' },
  },
  SEND_EMAIL: {
    id: 'SEND_EMAIL',
    label: 'Send Email',
    description: 'Email the current result to someone.',
    icon: Mail,
    accent: 'bg-elevated text-muted',
    hasInput: true,
    hasOutput: true,
    branching: false,
    defaultConfig: { to: '', subject: 'Automation result', body: '{{input}}' },
  },
  OUTPUT: {
    id: 'OUTPUT',
    label: 'Output',
    description: 'The workflow result.',
    icon: Send,
    accent: 'bg-ok/10 text-ok',
    hasInput: true,
    hasOutput: false,
    branching: false,
    defaultConfig: {},
  },
}

export const NODE_TYPE_LIST = Object.values(NODE_TYPES)

/** Node box geometry — shared by the canvas and the edge renderer. */
export const NODE_WIDTH = 200
export const NODE_HEIGHT = 68
