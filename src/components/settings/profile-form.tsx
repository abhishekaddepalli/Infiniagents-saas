'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Field, Input, PasswordInput } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { initials } from '@/lib/utils'

export function ProfileForm({
  initial,
}: {
  initial: { name: string; email: string; image: string; role: string; createdAt: string }
}) {
  const router = useRouter()
  const toast = useToast()

  const [profile, setProfile] = useState({
    name: initial.name,
    email: initial.email,
    image: initial.image,
  })
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    setSavingProfile(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error('Could not update your profile', data.error)
        return
      }
      toast.success('Profile updated')
      router.refresh()
    } catch {
      toast.error('Could not reach the server')
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault()
    if (passwords.newPassword !== passwords.confirm) {
      toast.error('Passwords do not match', 'Re-enter your new password to confirm it.')
      return
    }
    setSavingPassword(true)
    try {
      const response = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error('Could not change your password', data.error)
        return
      }
      toast.success('Password updated')
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' })
    } catch {
      toast.error('Could not reach the server')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader title="Profile" description="How your name and email appear in the product" />
          <CardBody>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="flex items-center gap-4">
                {profile.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.image}
                    alt=""
                    className="h-16 w-16 rounded-full border border-line object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-lg font-medium text-white">
                    {initials(profile.name || 'U')}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <Field label="Profile image URL" hint="Paste a link to an image, or leave it blank for initials.">
                    <Input
                      value={profile.image}
                      onChange={(event) => setProfile({ ...profile, image: event.target.value })}
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </Field>
                </div>
              </div>

              <Field label="Full name" required>
                <Input
                  value={profile.name}
                  onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                  required
                />
              </Field>

              <Field label="Email address" required>
                <Input
                  type="email"
                  value={profile.email}
                  onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                  required
                />
              </Field>

              <Button type="submit" loading={savingProfile}>
                Save changes
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Password" description="Use a password you do not reuse anywhere else" />
          <CardBody>
            <form onSubmit={savePassword} className="space-y-4">
              <Field label="Current password" required>
                <PasswordInput
                  value={passwords.currentPassword}
                  onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })}
                  autoComplete="current-password"
                  required
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="New password" required hint="At least 8 characters.">
                  <PasswordInput
                    value={passwords.newPassword}
                    onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
                    autoComplete="new-password"
                    required
                  />
                </Field>
                <Field label="Confirm new password" required>
                  <PasswordInput
                    value={passwords.confirm}
                    onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })}
                    autoComplete="new-password"
                    required
                  />
                </Field>
              </div>
              <Button type="submit" loading={savingPassword}>
                Update password
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader title="Account details" />
          <CardBody>
            <dl className="space-y-3 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Role</dt>
                <dd className="text-ink">{initial.role === 'ADMIN' ? 'Administrator' : 'User'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Member since</dt>
                <dd className="text-ink">{initial.createdAt}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
