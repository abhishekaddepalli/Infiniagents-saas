import 'server-only'
import { WorkspaceRole } from '@prisma/client'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { prisma } from './db'
import { AppError } from './api'
import { ForbiddenError, getCurrentUser, type SessionUser } from './auth'
import { slugify } from './utils'

const WORKSPACE_COOKIE = 'agentflow_workspace'

export type WorkspaceContext = {
  user: SessionUser
  workspaceId: string
  workspaceName: string
  workspaceSlug: string
  role: WorkspaceRole
  isPersonal: boolean
}

/** Rank used for "at least this role" checks. */
const RANK: Record<WorkspaceRole, number> = { MEMBER: 1, ADMIN: 2, OWNER: 3 }

export function hasAtLeast(role: WorkspaceRole, required: WorkspaceRole) {
  return RANK[role] >= RANK[required]
}

/**
 * Resolves which workspace the request is acting in.
 *
 * Order: the workspace cookie, then the user's last-used workspace, then their
 * first membership. Every candidate is checked against actual membership, so a
 * forged cookie cannot reach another team's data.
 */
export const getWorkspaceContext = cache(async (): Promise<WorkspaceContext | null> => {
  const user = await getCurrentUser()
  if (!user) return null

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    include: { workspace: { select: { id: true, name: true, slug: true, isPersonal: true } } },
    orderBy: { createdAt: 'asc' },
  })
  if (memberships.length === 0) return null

  const store = await cookies()
  const requested = store.get(WORKSPACE_COOKIE)?.value ?? user.lastWorkspaceId ?? null

  const active =
    memberships.find((membership) => membership.workspaceId === requested) ?? memberships[0]

  return {
    user,
    workspaceId: active.workspace.id,
    workspaceName: active.workspace.name,
    workspaceSlug: active.workspace.slug,
    role: active.role,
    isPersonal: active.workspace.isPersonal,
  }
})

export async function requireWorkspace(): Promise<WorkspaceContext> {
  const context = await getWorkspaceContext()
  if (!context) throw new AppError('No workspace is available for your account.', 403)
  return context
}

/** Use for actions only owners/admins may take (billing, members, API keys). */
export async function requireWorkspaceRole(required: WorkspaceRole): Promise<WorkspaceContext> {
  const context = await requireWorkspace()
  if (!hasAtLeast(context.role, required)) {
    throw new ForbiddenError()
  }
  return context
}

/** Switches the active workspace, after confirming membership. */
export async function setActiveWorkspace(userId: string, workspaceId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  })
  if (!membership) throw new AppError('You are not a member of that workspace.', 403)

  const store = await cookies()
  store.set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  await prisma.user.update({ where: { id: userId }, data: { lastWorkspaceId: workspaceId } })
}

/** Every workspace slug must be unique; append a counter when it collides. */
export async function uniqueWorkspaceSlug(name: string): Promise<string> {
  const base = slugify(name) || 'workspace'
  for (let attempt = 0; attempt < 50; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`
    const taken = await prisma.workspace.findUnique({ where: { slug }, select: { id: true } })
    if (!taken) return slug
  }
  return `${base}-${Date.now()}`
}

/**
 * Creates a workspace and makes the given user its owner.
 * Used on registration (personal workspace) and from the workspace switcher.
 */
export async function createWorkspace(options: {
  userId: string
  name: string
  isPersonal?: boolean
}) {
  const slug = await uniqueWorkspaceSlug(options.name)
  const freePlan = await prisma.plan.findFirst({ where: { slug: 'free' } })

  return prisma.workspace.create({
    data: {
      name: options.name,
      slug,
      ownerId: options.userId,
      isPersonal: options.isPersonal ?? false,
      members: { create: { userId: options.userId, role: 'OWNER' } },
      ...(freePlan ? { subscription: { create: { planId: freePlan.id } } } : {}),
    },
  })
}
