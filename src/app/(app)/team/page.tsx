import { PageHeader } from '@/components/layout/page-header'
import { TeamPanel } from '@/components/settings/team-panel'
import { requireWorkspace } from '@/lib/workspace'
import { getPlanUsage } from '@/lib/plans'
import { isEmailConfigured } from '@/lib/email'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Team' }
export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const context = await requireWorkspace()

  const [members, invitations, usage] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: context.workspaceId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.workspaceInvitation.findMany({
      where: { workspaceId: context.workspaceId, acceptedAt: null },
      orderBy: { createdAt: 'desc' },
    }),
    getPlanUsage(context.workspaceId),
  ])

  return (
    <div>
      <PageHeader
        title="Team"
        description={`Who can work in ${context.workspaceName}, and what they are allowed to do.`}
      />
      <TeamPanel
        workspaceId={context.workspaceId}
        workspaceName={context.workspaceName}
        isPersonal={context.isPersonal}
        currentUserId={context.user.id}
        currentRole={context.role}
        emailConfigured={isEmailConfigured()}
        seats={usage.members}
        members={members.map((member) => ({
          id: member.id,
          userId: member.user.id,
          name: member.user.name,
          email: member.user.email,
          image: member.user.image,
          role: member.role,
          joinedAt: member.createdAt.toISOString(),
        }))}
        invitations={invitations.map((invitation) => ({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt.toISOString(),
          createdAt: invitation.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
