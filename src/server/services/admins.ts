import { z } from "zod";
import { auth } from "@/server/auth";
import { audit } from "@/server/audit";
import { ServiceError } from "@/server/errors";
import { prisma } from "@/server/db";
import { ADMIN_ROLES, can, type Actor, type AdminRole } from "@/server/policy";
import { appUrl, generateToken, hashToken } from "@/server/tokens";

const INVITE_DAYS = 7;
const RESET_DAYS = 2;

export { ServiceError };

function assertCanManage(actor: Actor) {
  if (!can(actor, "admin.manage")) throw new ServiceError("forbidden");
}

export const inviteSchema = z.object({
  email: z.email().transform((v) => v.trim().toLowerCase()),
  name: z.string().trim().min(2).max(100),
  role: z.enum(ADMIN_ROLES),
});

export const acceptSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    password: z.string().min(12).max(128),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "mismatch" });

// ── Queries ──

export async function listAdmins() {
  const [users, lastSignIns] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, banned: true, twoFactorEnabled: true, createdAt: true },
    }),
    prisma.auditLog.groupBy({ by: ["actorId"], where: { action: "auth.sign_in" }, _max: { at: true } }),
  ]);
  const lastByUser = new Map(lastSignIns.map((r) => [r.actorId, r._max.at]));
  return users.map((u) => ({ ...u, lastSignInAt: lastByUser.get(u.id) ?? null }));
}

export async function listPendingInvites() {
  return prisma.adminInvite.findMany({
    where: { usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, purpose: true, expiresAt: true },
  });
}

/** Look up a usable invite or reset link. Returns null when unknown, used, revoked or expired. */
export async function findUsableInvite(token: string) {
  const invite = await prisma.adminInvite.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invite || invite.usedAt || invite.revokedAt || invite.expiresAt <= new Date()) return null;
  return invite;
}

// ── Commands ──

/**
 * Create an invite link. `actor` is null only for the bootstrap script that invites the first owner.
 * Returns the link; it is shown once and never stored.
 */
export async function createInvite(actor: Actor | null, input: z.input<typeof inviteSchema>): Promise<string> {
  if (actor) assertCanManage(actor);
  const { email, name, role } = inviteSchema.parse(input);

  if (await prisma.user.findUnique({ where: { email } })) throw new ServiceError("email_in_use");

  // Only the newest invite for an address stays valid.
  await prisma.adminInvite.updateMany({
    where: { email, purpose: "INVITE", usedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const { token, tokenHash } = generateToken();
  const invite = await prisma.adminInvite.create({
    data: {
      tokenHash,
      email,
      name,
      role,
      createdById: actor?.id ?? null,
      expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
    },
  });
  await audit({ actorId: actor?.id, action: "admin.invite", entityType: "adminInvite", entityId: invite.id, meta: { email, role } });
  return appUrl(`/admin/invite/${token}`);
}

/** Create a reset link: the admin sets a new password and enrols 2FA again. */
export async function createResetLink(actor: Actor, userId: string): Promise<string> {
  assertCanManage(actor);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ServiceError("not_found");

  await prisma.adminInvite.updateMany({
    where: { userId, purpose: "RESET", usedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  const { token, tokenHash } = generateToken();
  const invite = await prisma.adminInvite.create({
    data: {
      tokenHash,
      purpose: "RESET",
      email: user.email,
      name: user.name,
      role: user.role ?? "editor",
      userId,
      createdById: actor.id,
      expiresAt: new Date(Date.now() + RESET_DAYS * 86_400_000),
    },
  });
  await audit({ actorId: actor.id, action: "admin.reset_link", entityType: "user", entityId: userId, meta: { inviteId: invite.id } });
  return appUrl(`/admin/invite/${token}`);
}

export async function revokeInvite(actor: Actor, inviteId: string) {
  assertCanManage(actor);
  await prisma.adminInvite.update({ where: { id: inviteId }, data: { revokedAt: new Date() } });
  await audit({ actorId: actor.id, action: "admin.invite_revoke", entityType: "adminInvite", entityId: inviteId });
}

/** Use an invite (create the account) or a reset link (new password, 2FA cleared). */
export async function acceptInvite(token: string, input: z.input<typeof acceptSchema>) {
  const { name, password } = acceptSchema.parse(input);
  const now = new Date();

  // Claim the link atomically so it can't be used twice.
  const tokenHash = hashToken(token);
  const claimed = await prisma.adminInvite.updateMany({
    where: { tokenHash, usedAt: null, revokedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (claimed.count !== 1) throw new ServiceError("invalid_link");
  const invite = await prisma.adminInvite.findUniqueOrThrow({ where: { tokenHash } });

  try {
    if (invite.purpose === "INVITE") {
      const { user } = await auth.api.createUser({
        body: { email: invite.email, password, name, role: invite.role as AdminRole },
      });
      await audit({ actorId: user.id, action: "admin.invite_accept", entityType: "user", entityId: user.id, meta: { role: invite.role } });
      return;
    }

    const userId = invite.userId;
    if (!userId) throw new ServiceError("invalid_link");
    const ctx = await auth.$context;
    await ctx.internalAdapter.updatePassword(userId, await ctx.password.hash(password));
    await prisma.$transaction([
      prisma.twoFactor.deleteMany({ where: { userId } }),
      prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false, name } }),
      prisma.session.deleteMany({ where: { userId } }),
    ]);
    await audit({ actorId: userId, action: "admin.reset_accept", entityType: "user", entityId: userId });
  } catch (error) {
    // Give the link back if account creation failed, so the person can retry.
    await prisma.adminInvite.update({ where: { id: invite.id }, data: { usedAt: null } });
    throw error;
  }
}

async function assertNotLastOwner(userId: string) {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (target?.role !== "owner") return;
  const owners = await prisma.user.count({ where: { role: "owner", banned: { not: true } } });
  if (owners <= 1) throw new ServiceError("last_owner");
}

export async function changeRole(actor: Actor, userId: string, role: AdminRole) {
  assertCanManage(actor);
  if (!ADMIN_ROLES.includes(role)) throw new ServiceError("invalid_role");
  if (userId === actor.id) throw new ServiceError("self");
  if (role !== "owner") await assertNotLastOwner(userId);
  const before = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true } });
  await prisma.user.update({ where: { id: userId }, data: { role } });
  await audit({ actorId: actor.id, action: "admin.role_change", entityType: "user", entityId: userId, meta: { from: before.role, to: role } });
}

/** Deactivate (sign out everywhere and block sign-in) or reactivate an admin. */
export async function setActive(actor: Actor, userId: string, active: boolean) {
  assertCanManage(actor);
  if (userId === actor.id) throw new ServiceError("self");
  if (!active) await assertNotLastOwner(userId);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: active ? { banned: false, banReason: null, banExpires: null } : { banned: true, banReason: "Deactivated" },
    }),
    ...(active ? [] : [prisma.session.deleteMany({ where: { userId } })]),
  ]);
  await audit({ actorId: actor.id, action: active ? "admin.reactivate" : "admin.deactivate", entityType: "user", entityId: userId });
}

export async function hasActiveOwner(): Promise<boolean> {
  return (await prisma.user.count({ where: { role: "owner", banned: { not: true } } })) > 0;
}
