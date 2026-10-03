import { prisma } from '../db'
import { AppError } from '../api'
import type { z } from 'zod'
import type { connectionSchema, nodeSchema } from '../validation'

type NodeInput = z.infer<typeof nodeSchema>
type ConnectionInput = z.infer<typeof connectionSchema>

/**
 * Replaces an automation's graph in one transaction.
 *
 * The canvas sends client-generated node ids, so the whole graph is rewritten
 * rather than diffed — far simpler to read, and a workflow is small enough
 * that the cost is irrelevant. A map from client id to database id keeps the
 * connections pointing at the right rows.
 */
export async function saveGraph(
  automationId: string,
  workspaceId: string,
  nodes: NodeInput[],
  connections: ConnectionInput[],
) {
  // Only agents in this workspace may be referenced by an AI Agent node.
  const referencedAgentIds = [...new Set(nodes.map((node) => node.agentId).filter(Boolean) as string[])]
  if (referencedAgentIds.length > 0) {
    const owned = await prisma.agent.count({
      where: { id: { in: referencedAgentIds }, workspaceId },
    })
    if (owned !== referencedAgentIds.length) {
      throw new AppError('One of the selected agents is not available in this workspace.', 403)
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.automationConnection.deleteMany({ where: { automationId } })
    await tx.automationNode.deleteMany({ where: { automationId } })

    const idMap = new Map<string, string>()
    for (const node of nodes) {
      const created = await tx.automationNode.create({
        data: {
          automationId,
          type: node.type,
          label: node.label,
          config: node.config,
          positionX: node.positionX,
          positionY: node.positionY,
          agentId: node.type === 'AI_AGENT' ? (node.agentId ?? null) : null,
        },
      })
      idMap.set(node.id, created.id)
    }

    for (const connection of connections) {
      const sourceId = idMap.get(connection.sourceId)
      const targetId = idMap.get(connection.targetId)
      // Silently drop edges that reference a node the client removed.
      if (!sourceId || !targetId) continue
      await tx.automationConnection.create({
        data: { automationId, sourceId, targetId, branch: connection.branch ?? null },
      })
    }
  })
}
