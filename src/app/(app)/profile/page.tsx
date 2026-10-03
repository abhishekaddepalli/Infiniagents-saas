import { PageHeader } from '@/components/layout/page-header'
import { ProfileForm } from '@/components/settings/profile-form'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Profile' }
export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const session = await requireUser()
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.id },
    select: { name: true, email: true, image: true, role: true, createdAt: true },
  })

  return (
    <div>
      <PageHeader title="Profile" description="Your personal details and account password." />
      <ProfileForm
        initial={{
          name: user.name,
          email: user.email,
          image: user.image ?? '',
          role: user.role,
          createdAt: formatDate(user.createdAt),
        }}
      />
    </div>
  )
}
