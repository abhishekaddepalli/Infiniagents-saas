'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Building2, Check, ChevronsUpDown, Plus, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export type WorkspaceOption = {
  id: string
  name: string
  isPersonal: boolean
  role: string
}

/**
 * Switches the active workspace.
 *
 * Switching sets a cookie server-side and reloads, because every server
 * component reads the workspace from that cookie — a client-only swap would
 * leave the page showing the previous workspace's data.
 */
export function WorkspaceSwitcher({
  current,
  workspaces,
}: {
  current: WorkspaceOption
  workspaces: WorkspaceOption[]
}) {
  const router = useRouter()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function switchTo(workspaceId: string) {
    if (workspaceId === current.id) {
      setOpen(false)
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/workspaces/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })
      if (!response.ok) {
        const data = await response.json()
        toast.error('Could not switch workspace', data.error)
        return
      }
      setOpen(false)
      router.push('/dashboard')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function create() {
    setBusy(true)
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error('Could not create the workspace', data.error)
        return
      }
      toast.success(`"${name}" created`)
      setCreating(false)
      setName('')
      router.push('/dashboard')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-bg px-2.5 py-2 text-left transition-colors hover:bg-elevated"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-300">
            {current.isPersonal ? <UserIcon className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">{current.name}</span>
            <span className="block truncate text-[11px] capitalize text-muted">
              {current.role.toLowerCase()}
            </span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute left-0 right-0 top-full z-40 mt-1 animate-fade-in overflow-hidden rounded-xl border border-line bg-elevated p-1 shadow-pop">
              <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
                Workspaces
              </p>
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  disabled={busy}
                  onClick={() => switchTo(workspace.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                    workspace.id === current.id ? 'text-ink' : 'text-muted hover:bg-line/50 hover:text-ink',
                  )}
                >
                  {workspace.isPersonal ? (
                    <UserIcon className="h-4 w-4 shrink-0" />
                  ) : (
                    <Building2 className="h-4 w-4 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                  {workspace.id === current.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              ))}

              <div className="my-1 border-t border-line" />
              <button
                onClick={() => {
                  setOpen(false)
                  setCreating(true)
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-muted transition-colors hover:bg-line/50 hover:text-ink"
              >
                <Plus className="h-4 w-4 shrink-0" />
                Create a workspace
              </button>
            </div>
          </>
        )}
      </div>

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Create a workspace"
        description="Workspaces keep agents, automations and billing separate. Invite teammates once it exists."
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={create} loading={busy} disabled={name.trim().length < 2}>
              Create workspace
            </Button>
          </>
        }
      >
        <Field label="Workspace name" required>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Acme AI Team"
            autoFocus
          />
        </Field>
      </Dialog>
    </>
  )
}
