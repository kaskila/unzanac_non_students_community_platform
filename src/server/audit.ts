import { createHash } from "node:crypto";
import { prisma } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";

export type AuditEntry = {
  actorId?: string | null; // null = public visitor or system
  action: string; // e.g. "admin.invite", "announcement.publish"
  entityType: string;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue;
  ip?: string | null;
};

/** Hash IPs so the log can spot repeated abuse without storing raw addresses. */
export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(`${process.env.BETTER_AUTH_SECRET ?? ""}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

export async function audit(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      meta: entry.meta,
      ipHash: entry.ip ? hashIp(entry.ip) : null,
    },
  });
}
