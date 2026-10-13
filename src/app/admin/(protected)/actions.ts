"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { audit } from "@/server/audit";
import { getActor } from "@/server/session";

export async function signOutAction() {
  const actor = await getActor();
  await auth.api.signOut({ headers: await headers() });
  if (actor) await audit({ actorId: actor.id, action: "auth.sign_out", entityType: "user", entityId: actor.id });
  redirect("/admin/login");
}
