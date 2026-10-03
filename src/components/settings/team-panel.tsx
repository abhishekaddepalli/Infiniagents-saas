'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Copy, Mail, MoreVertical, Shield, Trash2, UserPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Dropdown } from '@/components/ui/dropdown'
import { Field, Input, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { formatDate, initials, percentOf } from '@/lib/utils'

export type MemberRow = {
  id: string
  userId: string
  name: string
  email: string
  image: string | null
  role: string
  joinedAt: string
}

export type InvitationRow = {
  id: string
  email: string
  role: string
  expiresAt: string
  createdAt: string
}

const ROLE_HELP: Record<string, string> = {
  OWNER: 'Full control, including deleting the workspace. There is exactly one owner.',
  ADMIN: 'Can manage members, API keys, provider keys and billing.',
  MEMBER: 'Can create and run agents and automations.',
}

export function TeamPanel({
  workspaceId,
  workspaceName,
  isPersonal,
  currentUserId,
  currentRole,
  members,
  invitations,
  seats,
  emailConfigured,
}: {
  workspaceId: string
  workspaceName: string
  isPersonal: boolean
  currentUserId: string
  currentRole: string
  members: MemberRow[]
  invitations: InvitationRow[]
  seats: { used: number; limit: number }
  emailConfigured: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const [inviting, setInviting] = useState(false)
  const [invite, setInvite] = useState({ email: '', role: 'MEMBER' })
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [removing, setRemoving] = useState<MemberRow | null>(null)
  const [busy, setBusy] = useState(false)

  const canManage = currentRole === 'OWNER' || currentRole === 'ADMIN'
  const atSeatLimit = seats.limit !== -1 && seats.used >= seats.limit

  async function sendInvite() {
    setBusy(true)
    setInviteLink(null)
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invite),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error('Could not send the invitation', data.error)
        return
      }
      if (data.inviteUrl) {
        // No mail provider configured — hand the link over instead of losing it.
        setInviteLink(data.inviteUrl)
        toast.info('Invitation created', 'Copy the link below and send it yourself.')
      } else {
        toast.success(`Invitation sent to ${invite.email}`)
        setInviting(false)
      }
      setInvite({ email: '', role: 'MEMBER' })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function changeRole(member: MemberRow, role: string) {
    const response = await fetch(`/api/workspaces/${workspaceId}/members/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    const data = await response.json()
    if (!response.ok) {
      toast.error('Could not change the role', data.error)
      return
    }
    toast.success(`${member.name} is now ${role.toLowerCase()}`)
    router.refresh()
  }

  async function removeMember(member: MemberRow) {
    setBusy(true)
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/${member.id}`, {
        method: 'DELETE',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error('Could not remove the member', data.error)
        return
      }
      const isSelf = member.userId === currentUserId
      toast.success(isSelf ? 'You left the workspace' : `${member.name} removed`)
      if (isSelf) {
        router.push('/dashboard')
      }
      router.refresh()
    } finally {
      setBusy(false)
      setRemoving(null)
    }
  }

  async function revokeInvite(invitation: InvitationRow) {
    const response = await fetch(`/api/workspaces/${workspaceId}/invitations/${invitation.id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      toast.error('Could not revoke the invitation')
      return
    }
    toast.success('Invitation revoked')
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {isPersonal && (
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-sm font-medium text-ink">This is your personal workspace</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Personal workspaces are just for you. Create a team workspace from the switcher in the
            sidebar to collaborate with others.
          </p>
        </div>
      )}

      <Card>
        <CardHeader
          title="Members"
          description={
            seats.limit === -1
              ? `${seats.used} members`
              : `${seats.used} of ${seats.limit} seats used`
          }
          action={
            canManage && (
              <Button size="sm" onClick={() => setInviting(true)} disabled={atSeatLimit}>
                <UserPlus className="h-4 w-4" />
                Invite
              </Button>
            )
          }
        />
        <CardBody className="p-0">
          {seats.limit !== -1 && (
            <div className="px-5 pt-4">
              <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
                <div
                  className={`h-full rounded-full ${atSeatLimit ? 'bg-warn' : 'bg-brand-600'}`}
                  style={{ width: `${Math.max(percentOf(seats.used, seats.limit), 3)}%` }}
                />
              </div>
              {atSeatLimit && (
                <p className="mt-2 text-xs text-warn">
                  All seats on your plan are in use. Upgrade to invite more people.
                </p>
              )}
            </div>
          )}

          <ul className="divide-y divide-line">
            {members.map((member) => (
              <li key={member.id} className="flex items-center gap-3 px-5 py-3.5">
                {member.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.image} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-medium text-white">
                    {initials(member.name)}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {member.name}
                    {member.userId === currentUserId && (
                      <span className="ml-1.5 text-[11px] font-normal text-muted">(you)</span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-muted">{member.email}</p>
                </div>

                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-[11px] text-faint">Joined {formatDate(member.joinedAt)}</p>
                </div>

                <Badge tone={member.role === 'OWNER' ? 'brand' : 'neutral'}>
                  {member.role.charAt(0) + member.role.slice(1).toLowerCase()}
                </Badge>

                {(canManage || member.userId === currentUserId) && member.role !== 'OWNER' && (
                  <Dropdown
                    trigger={
                      <button
                        className="rounded-lg p-1.5 text-muted hover:bg-elevated"
                        aria-label={`Actions for ${member.name}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    }
                    items={[
                      ...(canManage && member.userId !== currentUserId
                        ? [
                            {
                              label: member.role === 'ADMIN' ? 'Make member' : 'Make admin',
                              icon: Shield,
                              onClick: () =>
                                changeRole(member, member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'),
                            },
                          ]
                        : []),
                      {
                        label: member.userId === currentUserId ? 'Leave workspace' : 'Remove',
                        icon: Trash2,
                        onClick: () => setRemoving(member),
                        danger: true,
                      },
                    ]}
                  />
                )}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {invitations.length > 0 && (
        <Card>
          <CardHeader title="Pending invitations" description="Not yet accepted" />
          <CardBody className="p-0">
            <ul className="divide-y divide-line">
              {invitations.map((invitation) => (
                <li key={invitation.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-elevated text-muted">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-ink">{invitation.email}</p>
                    <p className="text-[11px] text-muted">
                      Expires {formatDate(invitation.expiresAt)}
                    </p>
                  </div>
                  <Badge>{invitation.role.toLowerCase()}</Badge>
                  {canManage && (
                    <button
                      onClick={() => revokeInvite(invitation)}
                      className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                      aria-label={`Revoke invitation for ${invitation.email}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <Dialog
        open={inviting}
        onClose={() => {
          setInviting(false)
          setInviteLink(null)
        }}
        title={`Invite someone to ${workspaceName}`}
        description="They will be able to sign in and work in this workspace."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setInviting(false)
                setInviteLink(null)
              }}
            >
              Close
            </Button>
            <Button size="sm" onClick={sendInvite} loading={busy} disabled={!invite.email.includes('@')}>
              Send invitation
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Email address" required>
            <Input
              type="email"
              value={invite.email}
              onChange={(event) => setInvite({ ...invite, email: event.target.value })}
              placeholder="teammate@company.com"
              autoFocus
            />
          </Field>

          <Field label="Role" hint={ROLE_HELP[invite.role]}>
            <Select
              value={invite.role}
              onChange={(event) => setInvite({ ...invite, role: event.target.value })}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </Field>

          {!emailConfigured && (
            <p className="rounded-lg border border-warn/20 bg-warn/10 p-3 text-[12px] leading-relaxed text-muted">
              No email provider is configured, so the invitation will not be delivered automatically.
              The link appears here for you to send yourself.
            </p>
          )}

          {inviteLink && (
            <div className="rounded-lg border border-line bg-bg p-3">
              <p className="text-[11px] font-medium text-ink">Invitation link</p>
              <p className="mt-1 break-all font-mono text-[11px] text-muted">{inviteLink}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink)
                  toast.success('Link copied')
                }}
                className="mt-2 flex items-center gap-1 text-[11px] font-medium text-brand-600 dark:text-brand-300"
              >
                <Copy className="h-3 w-3" />
                Copy link
              </button>
            </div>
          )}
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && removeMember(removing)}
        loading={busy}
        confirmLabel={removing?.userId === currentUserId ? 'Leave workspace' : 'Remove member'}
        title={
          removing?.userId === currentUserId
            ? `Leave ${workspaceName}?`
            : `Remove ${removing?.name}?`
        }
        message={
          removing?.userId === currentUserId
            ? 'You will lose access to this workspace and everything in it. An admin would have to invite you back.'
            : 'They lose access immediately. Agents and automations they created stay in the workspace.'
        }
      />
    </div>
  )
}
