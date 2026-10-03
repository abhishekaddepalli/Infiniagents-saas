import { ScrollText } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table'
import { requireWorkspaceRole } from '@/lib/workspace'
import { auditLabel } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { formatDateTime } from '@/lib/utils'

export const metadata = { title: 'Audit log' }
export const dynamic = 'force-dynamic'

export default async function AuditPage() {
  // Only admins and owners: the log names who did what, and members should
  // not be able to audit their colleagues.
  const { workspaceId, workspaceName } = await requireWorkspaceRole('ADMIN')

  const entries = await prisma.auditLog.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { user: { select: { name: true, email: true } } },
  })

  return (
    <div>
      <PageHeader
        title="Audit log"
        description={`Security and billing activity in ${workspaceName}, newest first.`}
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nothing logged yet"
          description="Creating agents, inviting members, issuing API keys and changing plans are all recorded here."
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Who</Th>
                <Th>Action</Th>
                <Th>Target</Th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const metadata = (entry.metadata ?? {}) as Record<string, unknown>
                const label =
                  typeof metadata.name === 'string'
                    ? metadata.name
                    : typeof metadata.email === 'string'
                      ? metadata.email
                      : (entry.targetId ?? '—')

                return (
                  <Tr key={entry.id}>
                    <Td className="whitespace-nowrap text-[13px] text-muted">
                      {formatDateTime(entry.createdAt)}
                    </Td>
                    <Td>
                      <p className="truncate text-[13px] text-ink">
                        {entry.user?.name ?? 'System'}
                      </p>
                      {entry.user && (
                        <p className="truncate text-[11px] text-muted">{entry.user.email}</p>
                      )}
                    </Td>
                    <Td className="text-[13px]">{auditLabel(entry.action)}</Td>
                    <Td className="max-w-[240px] truncate text-[13px] text-muted">{label}</Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </TableWrap>
      )}

      <p className="mt-3 text-xs text-muted">
        Showing the most recent {entries.length} entries. The log is append-only — entries cannot be
        edited or deleted from the interface.
      </p>
    </div>
  )
}
