'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NODE_HEIGHT, NODE_TYPES, NODE_WIDTH, type NodeTypeId } from './node-types'
import { cn } from '@/lib/utils'

export type CanvasNode = {
  id: string
  type: NodeTypeId
  label: string
  config: Record<string, unknown>
  positionX: number
  positionY: number
  agentId?: string | null
}

export type CanvasConnection = {
  id: string
  sourceId: string
  targetId: string
  branch?: string | null
}

type PendingLink = { sourceId: string; branch: string | null }

/**
 * The workflow canvas.
 *
 * Deliberately dependency-free: nodes are absolutely positioned divs, edges are
 * one SVG layer of bezier curves underneath them. Dragging updates node
 * coordinates directly. Everything a buyer needs to change lives in this file.
 */
export function Canvas({
  nodes,
  connections,
  selectedId,
  onSelect,
  onMoveNode,
  onConnect,
  onDeleteConnection,
  agentNames,
}: {
  nodes: CanvasNode[]
  connections: CanvasConnection[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onMoveNode: (id: string, x: number, y: number) => void
  onConnect: (sourceId: string, targetId: string, branch: string | null) => void
  onDeleteConnection: (id: string) => void
  agentNames: Record<string, string>
}) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const [pending, setPending] = useState<PendingLink | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null)

  /** Converts a page coordinate into canvas space, accounting for scroll. */
  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const box = surfaceRef.current?.getBoundingClientRect()
    if (!box) return { x: 0, y: 0 }
    return {
      x: clientX - box.left + (surfaceRef.current?.scrollLeft ?? 0),
      y: clientY - box.top + (surfaceRef.current?.scrollTop ?? 0),
    }
  }, [])

  // Node dragging and in-progress link tracking both run off window listeners,
  // so the pointer can leave the node without dropping the interaction.
  useEffect(() => {
    function onMove(event: MouseEvent) {
      const point = toCanvas(event.clientX, event.clientY)
      if (pending) setPointer(point)
      const drag = dragRef.current
      if (drag) {
        onMoveNode(drag.id, Math.max(0, point.x - drag.offsetX), Math.max(0, point.y - drag.offsetY))
      }
    }
    function onUp() {
      dragRef.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [pending, onMoveNode, toCanvas])

  // Escape cancels an in-progress connection.
  useEffect(() => {
    if (!pending) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setPending(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending])

  function startDrag(event: React.MouseEvent, node: CanvasNode) {
    event.stopPropagation()
    const point = toCanvas(event.clientX, event.clientY)
    dragRef.current = { id: node.id, offsetX: point.x - node.positionX, offsetY: point.y - node.positionY }
    onSelect(node.id)
  }

  function startLink(event: React.MouseEvent, sourceId: string, branch: string | null) {
    event.stopPropagation()
    setPending({ sourceId, branch })
    setPointer(toCanvas(event.clientX, event.clientY))
  }

  function finishLink(event: React.MouseEvent, targetId: string) {
    if (!pending) return
    event.stopPropagation()
    if (pending.sourceId !== targetId) onConnect(pending.sourceId, targetId, pending.branch)
    setPending(null)
  }

  // Port coordinates. A branching node stacks its true/false outputs.
  const outputPoint = (node: CanvasNode, branch: string | null) => {
    const meta = NODE_TYPES[node.type]
    if (!meta.branching || !branch) {
      return { x: node.positionX + NODE_WIDTH, y: node.positionY + NODE_HEIGHT / 2 }
    }
    return {
      x: node.positionX + NODE_WIDTH,
      y: node.positionY + (branch === 'true' ? NODE_HEIGHT * 0.32 : NODE_HEIGHT * 0.72),
    }
  }
  const inputPoint = (node: CanvasNode) => ({
    x: node.positionX,
    y: node.positionY + NODE_HEIGHT / 2,
  })

  /** Horizontal bezier so edges read as flowing left to right. */
  const curve = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const distance = Math.max(48, Math.abs(to.x - from.x) * 0.5)
    return `M ${from.x},${from.y} C ${from.x + distance},${from.y} ${to.x - distance},${to.y} ${to.x},${to.y}`
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  // Size the surface so it always extends past the furthest node.
  const width = Math.max(1200, ...nodes.map((node) => node.positionX + NODE_WIDTH + 160))
  const height = Math.max(560, ...nodes.map((node) => node.positionY + NODE_HEIGHT + 160))

  return (
    <div
      ref={surfaceRef}
      className="scroll-thin relative h-[calc(100vh-19rem)] min-h-[420px] overflow-auto rounded-xl border border-line bg-bg"
      onClick={() => {
        onSelect(null)
        setPending(null)
      }}
      style={{
        backgroundImage: 'radial-gradient(circle, rgb(var(--line)) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <div className="relative" style={{ width, height }}>
        {/* ------------------------- Edge layer ------------------------- */}
        <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgb(var(--faint))" />
            </marker>
          </defs>

          {connections.map((connection) => {
            const source = nodeById.get(connection.sourceId)
            const target = nodeById.get(connection.targetId)
            if (!source || !target) return null
            const from = outputPoint(source, connection.branch ?? null)
            const to = inputPoint(target)
            return (
              <g key={connection.id}>
                <path
                  d={curve(from, to)}
                  fill="none"
                  stroke="rgb(var(--faint))"
                  strokeWidth="2"
                  markerEnd="url(#arrow)"
                />
                {/* A fat transparent path makes the thin edge easy to click. */}
                <path
                  d={curve(from, to)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="16"
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onClick={(event) => {
                    event.stopPropagation()
                    onDeleteConnection(connection.id)
                  }}
                >
                  <title>Click to remove this connection</title>
                </path>
                {connection.branch && (
                  <text
                    x={(from.x + to.x) / 2}
                    y={(from.y + to.y) / 2 - 6}
                    textAnchor="middle"
                    className="fill-current text-[10px] font-medium text-muted"
                  >
                    {connection.branch === 'true' ? 'Yes' : 'No'}
                  </text>
                )}
              </g>
            )
          })}

          {/* Edge currently being drawn */}
          {pending && pointer && nodeById.get(pending.sourceId) && (
            <path
              d={curve(outputPoint(nodeById.get(pending.sourceId)!, pending.branch), pointer)}
              fill="none"
              stroke="rgb(var(--brand-500))"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          )}
        </svg>

        {/* ------------------------- Node layer ------------------------- */}
        {nodes.map((node) => {
          const meta = NODE_TYPES[node.type]
          const Icon = meta.icon
          const selected = selectedId === node.id
          const subtitle =
            node.type === 'AI_AGENT'
              ? (node.agentId && agentNames[node.agentId]) || 'No agent selected'
              : meta.label

          return (
            <div
              key={node.id}
              className={cn(
                'absolute select-none rounded-xl border bg-surface shadow-card transition-shadow',
                selected ? 'border-brand-600 shadow-pop' : 'border-line',
                pending && pending.sourceId !== node.id && meta.hasInput && 'ring-2 ring-brand-500/40',
              )}
              style={{ left: node.positionX, top: node.positionY, width: NODE_WIDTH, height: NODE_HEIGHT }}
              onClick={(event) => {
                event.stopPropagation()
                if (pending && meta.hasInput) finishLink(event, node.id)
                else onSelect(node.id)
              }}
            >
              <div
                className="flex h-full cursor-grab items-center gap-2.5 px-3 active:cursor-grabbing"
                onMouseDown={(event) => startDrag(event, node)}
              >
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', meta.accent)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">{node.label}</p>
                  <p className="truncate text-[11px] text-muted">{subtitle}</p>
                </div>
              </div>

              {/* Input port */}
              {meta.hasInput && (
                <span
                  className="absolute -left-[5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-surface bg-faint"
                  aria-hidden
                />
              )}

              {/* Output port(s) */}
              {meta.hasOutput &&
                (meta.branching ? ['true', 'false'] : [null]).map((branch, index) => (
                  <button
                    key={branch ?? 'single'}
                    onMouseDown={(event) => startLink(event, node.id, branch)}
                    title={branch ? `Connect the "${branch === 'true' ? 'Yes' : 'No'}" branch` : 'Drag to connect'}
                    aria-label={branch ? `Connect ${branch} branch` : 'Connect this node'}
                    className={cn(
                      'absolute -right-[7px] h-3.5 w-3.5 rounded-full border-2 border-surface transition-colors hover:scale-125',
                      branch === 'true' ? 'bg-ok' : branch === 'false' ? 'bg-danger' : 'bg-brand-600',
                    )}
                    style={{
                      top: meta.branching
                        ? `${index === 0 ? 32 : 72}%`
                        : 'calc(50% - 7px)',
                    }}
                  />
                ))}
            </div>
          )
        })}

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-ink">Your canvas is empty</p>
            <p className="mt-1 max-w-xs text-sm text-muted">
              Add a trigger from the panel on the left, then chain an AI agent onto it.
            </p>
          </div>
        )}
      </div>

      {pending && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg border border-line bg-elevated px-3 py-2 text-xs text-muted shadow-pop">
          Click a node to connect · Escape to cancel
        </div>
      )}
    </div>
  )
}
