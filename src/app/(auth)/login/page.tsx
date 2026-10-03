import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth/auth-form'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Sign in' }
export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/dashboard')

  // Surface the seeded demo account so a buyer can sign in immediately.
  const demo = await prisma.user.findFirst({ where: { isDemo: true }, select: { email: true } })
  return <AuthForm mode="login" demoEmail={demo?.email} />
}
