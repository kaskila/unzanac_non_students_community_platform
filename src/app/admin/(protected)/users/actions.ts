"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { isAdminRole } from "@/server/policy";
import { requirePermission } from "@/server/session";
import {
  changeRole,
  createInvite,
  createResetLink,
  revokeInvite,
  ServiceError,
  setActive,
} from "@/server/services/admins";

export type UserActionError = "email_in_use" | "last_owner" | "self" | "invalid" | "generic";
export type LinkState = { link?: string; email?: string; error?: UserActionError };
export type ResultState = { error?: UserActionError; ok?: boolean };

function toError(error: unknown): UserActionError {
  if (error instanceof z.ZodError) return "invalid";
  if (error instanceof ServiceError && ["email_in_use", "last_owner", "self"].includes(error.code)) {
    return error.code as UserActionError;
  }
  console.error(error);
  return "generic";
}

export async function inviteAction(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const actor = await requirePermission("admin.manage");
  const email = String(formData.get("email") ?? "");
  try {
    const link = await createInvite(actor, {
      email,
      name: String(formData.get("name") ?? ""),
      role: String(formData.get("role") ?? "") as never,
    });
    refresh();
    return { link, email: email.trim().toLowerCase() };
  } catch (error) {
    return { error: toError(error) };
  }
}

export async function resetLinkAction(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const actor = await requirePermission("admin.manage");
  try {
    const link = await createResetLink(actor, String(formData.get("userId") ?? ""));
    refresh();
    return { link, email: String(formData.get("email") ?? "") };
  } catch (error) {
    return { error: toError(error) };
  }
}

export async function changeRoleAction(_prev: ResultState, formData: FormData): Promise<ResultState> {
  const actor = await requirePermission("admin.manage");
  const role = formData.get("role");
  if (!isAdminRole(role)) return { error: "invalid" };
  try {
    await changeRole(actor, String(formData.get("userId") ?? ""), role);
    refresh();
    return { ok: true };
  } catch (error) {
    return { error: toError(error) };
  }
}

export async function setActiveAction(_prev: ResultState, formData: FormData): Promise<ResultState> {
  const actor = await requirePermission("admin.manage");
  try {
    await setActive(actor, String(formData.get("userId") ?? ""), formData.get("active") === "true");
    refresh();
    return { ok: true };
  } catch (error) {
    return { error: toError(error) };
  }
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  const actor = await requirePermission("admin.manage");
  await revokeInvite(actor, String(formData.get("inviteId") ?? ""));
  refresh();
}
