import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { SLUG_PATTERN, slugify } from "@/lib/slug";
import { audit } from "@/server/audit";
import { prisma } from "@/server/db";
import { ServiceError } from "@/server/errors";
import { fields } from "@/server/forms";
import { can, type Actor } from "@/server/policy";

function assertCanManage(actor: Actor) {
  if (!can(actor, "content.manage")) throw new ServiceError("forbidden");
}

export const committeeSchema = z.object({
  name: fields.required(80),
  slug: z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? "")
    .refine((v) => v === "" || SLUG_PATTERN.test(v), "slug"),
  description: fields.optional(1000),
  meetingInfo: fields.optional(200),
  contactName: fields.optional(80),
  contactPhone: z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const phone = normalizePhone(v);
      if (!phone) ctx.addIssue({ code: "custom", message: "phone" });
      return phone;
    }),
  sortOrder: z.coerce.number().int("invalid").min(0, "invalid").max(999, "invalid"),
  isPublic: fields.checkbox,
});

export async function listCommitteesForAdmin() {
  return prisma.committee.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

export async function getCommitteeForAdmin(id: string) {
  return prisma.committee.findUnique({ where: { id } });
}

export async function createCommittee(actor: Actor, input: Record<string, string>) {
  assertCanManage(actor);
  const data = committeeSchema.parse(input);
  const slug = data.slug || slugify(data.name);
  if (await prisma.committee.findUnique({ where: { slug } })) {
    throw new z.ZodError([{ code: "custom", path: ["slug"], message: "slug_taken", input: slug }]);
  }
  const committee = await prisma.committee.create({ data: { ...data, slug } });
  await audit({ actorId: actor.id, action: "committee.create", entityType: "committee", entityId: committee.id, meta: { slug } });
  return committee;
}

/** The slug stays fixed after creation so shared links keep working. */
export async function updateCommittee(actor: Actor, id: string, input: Record<string, string>) {
  assertCanManage(actor);
  const { slug: _ignored, ...data } = committeeSchema.parse(input);
  void _ignored;
  const committee = await prisma.committee.update({ where: { id }, data });
  await audit({ actorId: actor.id, action: "committee.update", entityType: "committee", entityId: id });
  return committee;
}
