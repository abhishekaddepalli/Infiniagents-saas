# Workspaces and teams

Everything a customer creates belongs to a **workspace**, never directly to a
user. This is the single most important thing to understand about the data
model, because it is the security boundary.

---

## The model

```
User ──< WorkspaceMember >── Workspace
                                 │
                                 ├── agents
                                 ├── automations + executions
                                 ├── conversations
                                 ├── knowledge bases
                                 ├── provider keys
                                 ├── API keys
                                 └── subscription + invoices
```

- Every account gets a **personal workspace** at registration.
- Users can create more, and be invited into other people's.
- One workspace is **active** at a time, chosen in the sidebar switcher.

## Roles

| Role | Can do |
|---|---|
| **Owner** | Everything, including deleting the workspace. Exactly one per workspace. |
| **Admin** | Manage members, API keys, provider keys, billing and the audit log. |
| **Member** | Create and run agents, automations and knowledge bases. |

Guard rails that are enforced in code, not just hidden in the UI:

- An admin cannot promote anyone to owner, or change an owner's role — otherwise
  an admin could take over the workspace.
- Nobody can change their own role.
- The owner cannot be removed; transfer ownership or delete the workspace.
- Anyone may remove *themselves* (leave), without admin rights.
- A personal workspace cannot be deleted.

---

## How the security boundary is enforced

Three pieces, and all three matter:

**1. Resolving the active workspace.** `getWorkspaceContext()` in
`src/lib/workspace.ts` reads a cookie, but only ever returns a workspace the
user is actually a member of. A forged cookie resolves to the user's first real
membership, not to whatever it names.

**2. Every query filters on `workspaceId`.** Not on `id` alone. This is why a
valid agent id from another workspace returns `404` rather than someone else's
data — the row simply is not in the result set.

```ts
// Correct
const agent = await prisma.agent.findFirst({ where: { id, workspaceId } })

// Wrong — reachable from any workspace
const agent = await prisma.agent.findUnique({ where: { id } })
```

**3. Role checks on privileged routes.** `requireWorkspaceRole('ADMIN')` at the
top of the handler, not a hidden button in the UI.

> **When you add a feature, this is the rule to follow.** Any new query against
> a workspace-owned table must filter by `workspaceId`. Isolation is enforced in
> application code, not by database row-level security.

---

## Invitations

1. An admin invites an email address and picks a role.
2. A 32-byte token is generated; **only its SHA-256 hash is stored**.
3. The link is emailed. With no mail provider configured it is returned to the
   inviter instead, so the flow still works during setup.
4. The invitee signs in and accepts. **Their account email must match the
   invited address** — a leaked link cannot be redeemed by whoever finds it.
5. Invitations expire after 7 days. Re-inviting replaces the old token rather
   than stacking invitations.

Seats are limited per plan (**Admin → Plans** → *Max team members*).

---

## Billing is per workspace

A subscription belongs to a workspace, not a person. Someone can be on a Free
personal workspace and a Business team workspace at once; limits follow whichever
one is active.

---

## Turning teams off

If you are selling a single-user product, you do not need to unpick the model —
just hide the entry points:

1. Remove the **Team** and **API Keys** links from `src/components/layout/sidebar.tsx`.
2. Remove `WorkspaceSwitcher` from the sidebar.
3. Set every plan's *Max team members* to 1 in **Admin → Plans**.

Each account keeps its personal workspace, everything keeps working, and you can
switch teams back on later by restoring those three things.
