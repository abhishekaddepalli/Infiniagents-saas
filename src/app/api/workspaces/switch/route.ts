import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, route } from '@/lib/api'
import { requireUser } from '@/lib/auth'
import { setActiveWorkspace } from '@/lib/workspace'

const schema = z.object({ workspaceId: z.string().min(1) })

/** Switches the active workspace. Membership is verified before the cookie is set. */
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser()
  const { workspaceId } = schema.parse(await request.json())
  await setActiveWorkspace(user.id, workspaceId)
  return ok({ workspaceId })
})
