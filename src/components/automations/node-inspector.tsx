'use client'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { NODE_TYPES } from './node-types'
import type { CanvasNode } from './canvas'

export type InspectorAgent = { id: string; name: string; status: string }
export type InspectorKnowledgeBase = { id: string; name: string; documents: number }

/**
 * Editor panel for the selected node.
 *
 * Each node type renders its own set of fields. When you add a node type,
 * add its fields here alongside the engine `case` that consumes them.
 */
export function NodeInspector({
  node,
  agents,
  knowledgeBases,
  onChange,
  onDelete,
}: {
  node: CanvasNode
  agents: InspectorAgent[]
  knowledgeBases: InspectorKnowledgeBase[]
  onChange: (patch: Partial<CanvasNode>) => void
  onDelete: () => void
}) {
  const meta = NODE_TYPES[node.type]
  const config = node.config

  const setConfig = (key: string, value: unknown) =>
    onChange({ config: { ...config, [key]: value } })

  const text = (key: string, fallback = '') =>
    typeof config[key] === 'string' ? (config[key] as string) : fallback

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 rounded-lg border border-line bg-bg p-3">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.accent}`}>
          <meta.icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-ink">{meta.label}</p>
          <p className="truncate text-[11px] text-muted">{meta.description}</p>
        </div>
      </div>

      <Field label="Step name">
        <Input value={node.label} onChange={(event) => onChange({ label: event.target.value })} />
      </Field>

      {/* ---------------------------- AI Agent --------------------------- */}
      {node.type === 'AI_AGENT' && (
        <>
          <Field label="Agent" required>
            <Select value={node.agentId ?? ''} onChange={(event) => onChange({ agentId: event.target.value })}>
              <option value="">Select an agent</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id} disabled={agent.status === 'INACTIVE'}>
                  {agent.name}
                  {agent.status === 'INACTIVE' ? ' (disabled)' : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Prompt"
            hint="Use {{input}} to insert whatever the previous step produced."
          >
            <Textarea
              rows={5}
              className="font-mono text-[12px]"
              value={text('prompt', '{{input}}')}
              onChange={(event) => setConfig('prompt', event.target.value)}
              placeholder="Summarise this support ticket:&#10;&#10;{{input}}"
            />
          </Field>
        </>
      )}

      {/* --------------------------- Text Input -------------------------- */}
      {node.type === 'TEXT_INPUT' && (
        <Field label="Text" hint="Leave {{input}} on its own to pass the payload through unchanged.">
          <Textarea
            rows={5}
            className="font-mono text-[12px]"
            value={text('text', '{{input}}')}
            onChange={(event) => setConfig('text', event.target.value)}
          />
        </Field>
      )}

      {/* ----------------------- Knowledge Search ------------------------ */}
      {node.type === 'KNOWLEDGE_SEARCH' && (
        <>
          <Field label="Knowledge base" required>
            <Select
              value={text('knowledgeBaseId')}
              onChange={(event) => setConfig('knowledgeBaseId', event.target.value)}
            >
              <option value="">Select a knowledge base</option>
              {knowledgeBases.map((base) => (
                <option key={base.id} value={base.id}>
                  {base.name} ({base.documents} {base.documents === 1 ? 'document' : 'documents'})
                </option>
              ))}
            </Select>
          </Field>
          {knowledgeBases.length === 0 && (
            <p className="rounded-lg border border-warn/20 bg-warn/10 p-3 text-[11px] leading-relaxed text-muted">
              This workspace has no knowledge bases yet. Create one under Knowledge Bases first.
            </p>
          )}
          <Field label="Query" hint="Use {{input}} to search with whatever the previous step produced.">
            <Textarea
              rows={3}
              className="font-mono text-[12px]"
              value={text('query', '{{input}}')}
              onChange={(event) => setConfig('query', event.target.value)}
            />
          </Field>
          <Field label="Results" hint="How many matching chunks to pass on.">
            <Input
              type="number"
              min={1}
              max={20}
              value={Number(config.limit ?? 5)}
              onChange={(event) => setConfig('limit', Number(event.target.value))}
            />
          </Field>
        </>
      )}

      {/* --------------------------- Transform --------------------------- */}
      {node.type === 'TRANSFORM' && (
        <>
          <Field label="Operation">
            <Select
              value={text('operation', 'template')}
              onChange={(event) => setConfig('operation', event.target.value)}
            >
              <option value="template">Template — rewrite using {'{{input}}'}</option>
              <option value="json_extract">Extract a JSON field</option>
              <option value="regex_extract">Extract with a regular expression</option>
              <option value="truncate">Truncate to a length</option>
              <option value="uppercase">Uppercase</option>
              <option value="lowercase">Lowercase</option>
              <option value="trim">Trim whitespace</option>
            </Select>
          </Field>

          {text('operation', 'template') === 'template' && (
            <Field label="Template">
              <Textarea
                rows={4}
                className="font-mono text-[12px]"
                value={text('template', '{{input}}')}
                onChange={(event) => setConfig('template', event.target.value)}
                placeholder={'Summary:\n\n{{input}}'}
              />
            </Field>
          )}
          {text('operation') === 'json_extract' && (
            <Field label="Field path" hint="Dot notation, e.g. data.items.0.title">
              <Input
                value={text('path')}
                onChange={(event) => setConfig('path', event.target.value)}
                placeholder="data.title"
                className="font-mono text-[13px]"
              />
            </Field>
          )}
          {text('operation') === 'regex_extract' && (
            <Field label="Pattern" hint="The first capture group is returned, if there is one.">
              <Input
                value={text('pattern')}
                onChange={(event) => setConfig('pattern', event.target.value)}
                placeholder="Score:\\s*(\\d+)"
                className="font-mono text-[13px]"
              />
            </Field>
          )}
          {text('operation') === 'truncate' && (
            <Field label="Maximum characters">
              <Input
                type="number"
                min={1}
                value={Number(config.length ?? 500)}
                onChange={(event) => setConfig('length', Number(event.target.value))}
              />
            </Field>
          )}
        </>
      )}

      {/* -------------------------- Send Email --------------------------- */}
      {node.type === 'SEND_EMAIL' && (
        <>
          <Field label="To" required hint="A fixed address, or {{input}} if a previous step produced one.">
            <Input
              value={text('to')}
              onChange={(event) => setConfig('to', event.target.value)}
              placeholder="team@example.com"
            />
          </Field>
          <Field label="Subject">
            <Input
              value={text('subject', 'Automation result')}
              onChange={(event) => setConfig('subject', event.target.value)}
            />
          </Field>
          <Field label="Body">
            <Textarea
              rows={4}
              className="font-mono text-[12px]"
              value={text('body', '{{input}}')}
              onChange={(event) => setConfig('body', event.target.value)}
            />
          </Field>
          <p className="rounded-lg border border-line bg-bg p-3 text-[11px] leading-relaxed text-muted">
            Needs an email provider configured with <span className="font-mono text-ink">EMAIL_PROVIDER</span>.
            Without one, messages are written to the server log instead of sent.
          </p>
        </>
      )}

      {/* --------------------------- Condition --------------------------- */}
      {node.type === 'CONDITION' && (
        <>
          <Field label="Check" hint="Evaluated against the text from the previous step.">
            <Select value={text('operator', 'contains')} onChange={(event) => setConfig('operator', event.target.value)}>
              <option value="contains">Contains</option>
              <option value="not_contains">Does not contain</option>
              <option value="equals">Equals exactly</option>
              <option value="longer_than">Is longer than (characters)</option>
              <option value="is_empty">Is empty</option>
            </Select>
          </Field>
          {text('operator', 'contains') !== 'is_empty' && (
            <Field label="Value">
              <Input
                value={text('value')}
                onChange={(event) => setConfig('value', event.target.value)}
                placeholder={text('operator') === 'longer_than' ? '500' : 'URGENT'}
              />
            </Field>
          )}
          <p className="rounded-lg border border-line bg-bg p-3 text-[11px] leading-relaxed text-muted">
            Connect the <span className="font-medium text-ok">green</span> port for a match and the{' '}
            <span className="font-medium text-danger">red</span> port for everything else.
          </p>
        </>
      )}

      {/* -------------------------- HTTP Request ------------------------- */}
      {node.type === 'HTTP_REQUEST' && (
        <>
          <Field label="Method">
            <Select value={text('method', 'GET')} onChange={(event) => setConfig('method', event.target.value)}>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </Select>
          </Field>
          <Field label="URL" required hint="Must be a public https:// address.">
            <Input
              value={text('url')}
              onChange={(event) => setConfig('url', event.target.value)}
              placeholder="https://api.example.com/items"
            />
          </Field>
          {text('method', 'GET') !== 'GET' && (
            <Field label="Request body">
              <Textarea
                rows={4}
                className="font-mono text-[12px]"
                value={text('body', '{{input}}')}
                onChange={(event) => setConfig('body', event.target.value)}
              />
            </Field>
          )}
          <p className="rounded-lg border border-line bg-bg p-3 text-[11px] leading-relaxed text-muted">
            Requests to localhost and private network addresses are blocked. Responses are truncated to 20,000
            characters.
          </p>
        </>
      )}

      {/* ----------------------------- Delay ----------------------------- */}
      {node.type === 'DELAY' && (
        <Field label="Wait (seconds)" hint="Capped at 10 seconds so manual runs stay responsive.">
          <Input
            type="number"
            min={1}
            max={10}
            value={Number(config.seconds ?? 1)}
            onChange={(event) => setConfig('seconds', Number(event.target.value))}
          />
        </Field>
      )}

      {(node.type === 'TRIGGER' || node.type === 'OUTPUT') && (
        <p className="rounded-lg border border-line bg-bg p-3 text-[11px] leading-relaxed text-muted">
          {node.type === 'TRIGGER'
            ? 'The trigger passes the run input straight to the next step. Choose how the workflow is triggered in the settings panel.'
            : 'Whatever reaches this node becomes the execution output, visible in your execution history.'}
        </p>
      )}

      <Button variant="ghost" className="w-full text-danger" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
        Delete step
      </Button>
    </div>
  )
}
