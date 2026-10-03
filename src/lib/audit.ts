import { Prisma } from '@prisma/client'
import { prisma } from './db'

/**
 * Append-only audit log.
 *
 * Records security- and billing-relevant actions so an admin can answer "who
 * changed this, and when". Writing a log entry must never break the action it
 * describes, so every failure here is swallowed and logged instead.
 *
 * Add new action names freely — they are plain strings, displayed as-is.
 * Convention: "<subject>.<verb>", e.g. "agent.created", "member.removed".
 */
export async function recordAudit(entry: {
  workspaceId?: string | null
  userId?: string | null
  action: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
  ip?: string | null
}) {
  try {
    await prisma.auditLog.create({
      data: {
        workspaceId: entry.workspaceId ?? null,
        userId: entry.userId ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        metadata: (entry.metadata ?? {}) as Prisma.InputJsonValue,
        ip: entry.ip ?? null,
      },
    })
  } catch (error) {
    console.error('[agentflow] could not write audit log entry:', error)
  }
}

/** Human-readable labels for the action names used across the app. */
export const AUDIT_LABELS: Record<string, string> = {
  'agent.created': 'Created an agent',
  'agent.updated': 'Updated an agent',
  'agent.deleted': 'Deleted an agent',
  'automation.created': 'Created an automation',
  'automation.updated': 'Updated an automation',
  'automation.deleted': 'Deleted an automation',
  'apikey.created': 'Created an API key',
  'apikey.revoked': 'Revoked an API key',
  'provider.key_saved': 'Saved a provider API key',
  'provider.key_removed': 'Removed a provider API key',
  'member.invited': 'Invited a member',
  'member.joined': 'Joined the workspace',
  'member.role_changed': "Changed a member's role",
  'member.removed': 'Removed a member',
  'workspace.created': 'Created the workspace',
  'workspace.updated': 'Updated workspace settings',
  'billing.plan_changed': 'Changed the plan',
  'knowledge.base_created': 'Created a knowledge base',
  'knowledge.document_added': 'Added a document',
  'knowledge.document_deleted': 'Deleted a document',
}

export function auditLabel(action: string) {
  return AUDIT_LABELS[action] ?? action
}
