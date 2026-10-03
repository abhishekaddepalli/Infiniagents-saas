'use client'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Ban, CircleCheck, MoreVertical, Trash2 } from 'lucide-react'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Dropdown } from '@/components/ui/dropdown'
import { Input, Select } from '@/components/ui/input'
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { formatDate, formatNumber, initials } from '@/lib/utils'

export type AdminUserRow = {
  id: string
  name: string
  email: string
  role: string
  status: string
  createdAt: string
  emailVerified: boolean
  planName: string
  workspaces: number
  agents: number
  automations: number
  requests: number
}

export function UserTable({ users, currentUserId }: { users: AdminUserRow[]; currentUserId: string }) {
  const router = useRouter()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [removing, setRemoving] = useState<AdminUserRow | null>(null)
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return users.filter((user) => {
      if (status && user.status !== status) return false
      if (!needle) return true
      return user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle)
    })
  }, [users, query, status])

  async function patch(user: AdminUserRow, body: object, message: string) {
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error('Action failed', data.error)
        return
      }
      toast.success(message)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function remove(user: AdminUserRow) {
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error('Could not delete the user', data.error)
        return
      }
      toast.success('User deleted')
      router.refresh()
    } finally {
      setBusy(false)
      setRemoving(null)
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or email"
          className="flex-1"
          aria-label="Search users"
        />
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="sm:w-44"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </Select>
      </div>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>User</Th>
              <Th>Plan</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th className="text-right">Workspaces</Th>
              <Th className="text-right">Agents</Th>
              <Th className="text-right">Automations</Th>
              <Th className="text-right">Requests</Th>
              <Th>Joined</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => {
              const isSelf = user.id === currentUserId
              return (
                <Tr key={user.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-medium text-white">
                        {initials(user.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-ink">{user.name}</p>
                        <p className="flex items-center gap-1.5 truncate text-[11px] text-muted">
                          {user.email}
                          {!user.emailVerified && (
                            <span className="shrink-0 text-warn" title="Email not confirmed">
                              ·  unverified
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-[13px]">{user.planName}</Td>
                  <Td>
                    <Badge tone={user.role === 'ADMIN' ? 'brand' : 'neutral'}>
                      {user.role === 'ADMIN' ? 'Admin' : 'User'}
                    </Badge>
                  </Td>
                  <Td>
                    <StatusBadge status={user.status} />
                  </Td>
                  <Td className="text-right font-mono text-xs">{user.workspaces}</Td>
                  <Td className="text-right font-mono text-xs">{user.agents}</Td>
                  <Td className="text-right font-mono text-xs">{user.automations}</Td>
                  <Td className="text-right font-mono text-xs">{formatNumber(user.requests)}</Td>
                  <Td className="whitespace-nowrap text-[13px] text-muted">{formatDate(user.createdAt)}</Td>
                  <Td className="text-right">
                    {isSelf ? (
                      <span className="text-[11px] text-faint">You</span>
                    ) : (
                      <Dropdown
                        trigger={
                          <button
                            className="rounded-lg p-1.5 text-muted hover:bg-elevated"
                            aria-label={`Actions for ${user.name}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        }
                        items={[
                          user.status === 'ACTIVE'
                            ? {
                                label: 'Disable user',
                                icon: Ban,
                                onClick: () => patch(user, { status: 'DISABLED' }, 'User disabled'),
                              }
                            : {
                                label: 'Enable user',
                                icon: CircleCheck,
                                onClick: () => patch(user, { status: 'ACTIVE' }, 'User enabled'),
                              },
                          user.role === 'ADMIN'
                            ? {
                                label: 'Remove admin role',
                                icon: CircleCheck,
                                onClick: () => patch(user, { role: 'USER' }, 'Admin role removed'),
                              }
                            : {
                                label: 'Make administrator',
                                icon: CircleCheck,
                                onClick: () => patch(user, { role: 'ADMIN' }, 'User promoted to admin'),
                              },
                          { label: 'Delete user', icon: Trash2, onClick: () => setRemoving(user), danger: true },
                        ]}
                      />
                    )}
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      </TableWrap>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove(removing)}
        loading={busy}
        title={`Delete ${removing?.name}?`}
        message="This permanently deletes the account along with its agents, automations, executions and usage history. This cannot be undone."
      />
    </div>
  )
}
