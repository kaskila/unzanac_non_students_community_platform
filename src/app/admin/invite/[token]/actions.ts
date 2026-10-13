"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { acceptInvite, ServiceError } from "@/server/services/admins";

export type AcceptState = { error?: "name" | "password" | "confirm" | "invalid_link" | "generic" };

export async function acceptInviteAction(_prev: AcceptState, formData: FormData): Promise<AcceptState> {
  const token = String(formData.get("token") ?? "");
  try {
    await acceptInvite(token, {
      name: String(formData.get("name") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirm: String(formData.get("confirm") ?? ""),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.issues[0]?.path[0];
      return { error: field === "name" || field === "password" || field === "confirm" ? field : "generic" };
    }
    if (error instanceof ServiceError && error.code === "invalid_link") return { error: "invalid_link" };
    console.error(error);
    return { error: "generic" };
  }
  redirect("/admin/login?ready=1");
}
