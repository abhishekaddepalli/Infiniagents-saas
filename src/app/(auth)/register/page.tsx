import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth/auth-form'
import { getCurrentUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'

export const metadata = { title: 'Create account' }
export const dynamic = 'force-dynamic'

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/dashboard')

  const settings = await getSettings()
  if (settings.allowRegistration !== 'true') {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Registration is closed</h1>
        <p className="mt-2 text-sm text-muted">
          New sign-ups are currently disabled. Contact {settings.supportEmail} if you need an account.
        </p>
      </div>
    )
  }

  return <AuthForm mode="register" />
}
