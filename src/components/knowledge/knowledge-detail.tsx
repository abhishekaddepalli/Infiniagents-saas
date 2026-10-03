'use client'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, FileText, Search, Trash2, Upload,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Field, Input, Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { formatDate, formatNumber } from '@/lib/utils'

export type DocumentRow = {
  id: string
  name: string
  mimeType: string
  sizeBytes: number
  status: string
  error: string | null
  chunkCount: number
  createdAt: string
}

type SearchResult = { documentName: string; content: string; score: number }

const ACCEPTED = '.txt,.md,.markdown,.csv,.json,.html,.htm,.pdf'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function KnowledgeDetail({
  baseId,
  documents,
  chunkCount,
  usingLocalEmbeddings,
}: {
  baseId: string
  documents: DocumentRow[]
  chunkCount: number
  usingLocalEmbeddings: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [pasting, setPasting] = useState(false)
  const [paste, setPaste] = useState({ name: '', content: '' })
  const [removing, setRemoving] = useState<DocumentRow | null>(null)
  const [busy, setBusy] = useState(false)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)

    // Uploaded one at a time so a single bad file does not fail the batch.
    for (const file of Array.from(files)) {
      const form = new FormData()
      form.append('file', file)
      try {
        const response = await fetch(`/api/knowledge/${baseId}/documents`, {
          method: 'POST',
          body: form,
        })
        const data = await response.json()
        if (!response.ok) {
          toast.error(`Could not add "${file.name}"`, data.error)
          continue
        }
        toast.success(`"${file.name}" indexed`, `${data.chunks} chunks created`)
      } catch {
        toast.error(`Could not upload "${file.name}"`, 'Check your connection and try again.')
      }
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
    router.refresh()
  }

  async function addPastedText() {
    setBusy(true)
    try {
      const response = await fetch(`/api/knowledge/${baseId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paste),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error('Could not add the text', data.error)
        return
      }
      toast.success(`"${paste.name}" indexed`, `${data.chunks} chunks created`)
      setPasting(false)
      setPaste({ name: '', content: '' })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function remove(document: DocumentRow) {
    setBusy(true)
    try {
      const response = await fetch(`/api/knowledge/${baseId}/documents/${document.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        toast.error('Could not delete the document')
        return
      }
      toast.success('Document removed')
      router.refresh()
    } finally {
      setBusy(false)
      setRemoving(null)
    }
  }

  async function runSearch(event: React.FormEvent) {
    event.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    try {
      const response = await fetch(`/api/knowledge/${baseId}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 5 }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error('Search failed', data.error)
        return
      }
      setResults(data.results)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader
            title="Documents"
            description={`${documents.length} ${documents.length === 1 ? 'document' : 'documents'} · ${formatNumber(chunkCount)} indexed chunks`}
            action={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setPasting(true)}>
                  Paste text
                </Button>
                <Button size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              </div>
            }
          />
          <CardBody className="p-0">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={ACCEPTED}
              className="hidden"
              onChange={(event) => upload(event.target.files)}
            />

            {documents.length === 0 ? (
              <EmptyState
                className="border-0"
                icon={FileText}
                title="No documents yet"
                description="Upload a file, or paste text directly. Supported formats: txt, md, csv, json, html and pdf, up to 5 MB each."
                action={
                  <Button onClick={() => fileRef.current?.click()} loading={uploading}>
                    <Upload className="h-4 w-4" />
                    Upload a document
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {documents.map((document) => (
                  <li key={document.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-muted">
                      <FileText className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{document.name}</p>
                      <p className="truncate text-[11px] text-muted">
                        {formatBytes(document.sizeBytes)} · {document.chunkCount} chunks ·{' '}
                        {formatDate(document.createdAt)}
                      </p>
                      {document.error && (
                        <p className="mt-1 flex items-start gap-1 text-[11px] text-danger">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          {document.error}
                        </p>
                      )}
                    </div>

                    <Badge
                      tone={
                        document.status === 'READY'
                          ? 'success'
                          : document.status === 'FAILED'
                            ? 'danger'
                            : 'warning'
                      }
                      dot
                    >
                      {document.status === 'READY' ? 'Indexed' : document.status.toLowerCase()}
                    </Badge>

                    <button
                      onClick={() => setRemoving(document)}
                      className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                      aria-label={`Delete ${document.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader title="Test retrieval" description="See exactly what an agent would be given" />
          <CardBody className="space-y-3">
            <form onSubmit={runSearch} className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="What is the refund policy?"
                  className="pl-9"
                  aria-label="Search the knowledge base"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="w-full"
                loading={searching}
                disabled={!query.trim() || documents.length === 0}
              >
                Search
              </Button>
            </form>

            {results !== null && (
              <div className="space-y-2 border-t border-line pt-3">
                {results.length === 0 ? (
                  <p className="text-xs text-muted">
                    No passages matched closely enough. Try different wording, or add more content.
                  </p>
                ) : (
                  results.map((result, index) => (
                    <div key={index} className="rounded-lg border border-line bg-bg p-3">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] font-medium text-ink">
                          {result.documentName}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-muted">
                          {result.score.toFixed(3)}
                        </span>
                      </div>
                      <p className="line-clamp-4 text-[12px] leading-relaxed text-muted">
                        {result.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {usingLocalEmbeddings && (
          <div className="rounded-xl border border-warn/20 bg-warn/10 p-4">
            <Badge tone="warning">Keyword embeddings</Badge>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              This base was indexed with the built-in embedder, which matches wording rather than
              meaning. Add a provider key under Settings → AI Providers, then create a new base and
              re-upload for proper semantic search.
            </p>
          </div>
        )}

        <div className="flex items-start gap-2.5 rounded-xl border border-line bg-surface p-4 text-xs text-muted">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Attach this base to an agent from the agent editor. Every reply will then quote the
            passages it used.
          </p>
        </div>
      </div>

      <Dialog
        open={pasting}
        onClose={() => setPasting(false)}
        title="Paste text"
        description="Useful for FAQs and policies that do not live in a file."
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setPasting(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={addPastedText}
              loading={busy}
              disabled={paste.name.trim().length < 1 || paste.content.trim().length < 20}
            >
              Index text
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Document name" required>
            <Input
              value={paste.name}
              onChange={(event) => setPaste({ ...paste, name: event.target.value })}
              placeholder="Refund policy"
            />
          </Field>
          <Field label="Content" required hint="At least 20 characters.">
            <Textarea
              rows={12}
              value={paste.content}
              onChange={(event) => setPaste({ ...paste, content: event.target.value })}
              placeholder="Paste your documentation here…"
            />
          </Field>
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove(removing)}
        loading={busy}
        title={`Delete "${removing?.name}"?`}
        message="Its indexed chunks are removed too, so agents will stop retrieving from it. This cannot be undone."
      />
    </div>
  )
}
