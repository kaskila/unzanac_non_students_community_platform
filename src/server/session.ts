import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { can, isAdminRole, type Action, type Actor } from "@/server/policy";

export type SessionActor = Actor & { twoFactorEnabled: boolean };

/** The signed-in admin for this request, or null. Deduplicated per request. */
export const getActor = cache(async (): Promise<SessionActor | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { user } = session;
  if (user.banned || !isAdminRole(user.role)) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    twoFactorEnabled: !!user.twoFactorEnabled,
  };
});

/**
 * Require a signed-in admin. Two-factor authentication is mandatory: an admin who hasn't
 * enrolled yet can only reach the 2FA setup page.
 */
export async function requireActor(options?: { allowWithoutTwoFactor?: boolean }): Promise<SessionActor> {
  const actor = await getActor();
  if (!actor) redirect("/admin/login");
  if (!actor.twoFactorEnabled && !options?.allowWithoutTwoFactor) redirect("/admin/setup-2fa");
  return actor;
}

/** Require a signed-in admin allowed to perform `action`; renders 403 otherwise. */
export async function requirePermission(action: Action): Promise<SessionActor> {
  const actor = await requireActor();
  if (!can(actor, action)) forbidden();
  return actor;
}
