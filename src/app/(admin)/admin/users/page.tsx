import { PageHeader } from '@/components/layout/page-header'
import { UserTable } from '@/components/admin/user-table'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Users' }
export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const admin = await requireAdmin()
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      // Resources belong to workspaces now, so per-user totals come from the
      // workspaces this person is a member of.
      memberships: {
        include: {
          workspace: {
            select: {
              name: true,
              isPersonal: true,
              subscription: { select: { plan: { select: { name: true } } } },
              _count: { select: { agents: true, automations: true, usage: true } },
            },
          },
        },
      },
      _count: { select: { memberships: true } },
    },
  })

  return (
    <div>
      <PageHeader title="Users" description="Every account on the platform and what it is using." />
      <UserTable
        currentUserId={admin.id}
        users={users.map((user) => {
          const personal = user.memberships.find((membership) => membership.workspace.isPersonal)
          const totals = user.memberships.reduce(
            (accumulator, membership) => ({
              agents: accumulator.agents + membership.workspace._count.agents,
              automations: accumulator.automations + membership.workspace._count.automations,
              requests: accumulator.requests + membership.workspace._count.usage,
            }),
            { agents: 0, automations: 0, requests: 0 },
          )

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            createdAt: user.createdAt.toISOString(),
            emailVerified: Boolean(user.emailVerifiedAt),
            planName:
              personal?.workspace.subscription?.plan.name ??
              user.memberships[0]?.workspace.subscription?.plan.name ??
              'Free',
            workspaces: user._count.memberships,
            agents: totals.agents,
            automations: totals.automations,
            requests: totals.requests,
          }
        })}
      />
    </div>
  )
}
