"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/server/cache-tags";
import { formValues, toFormState, type FormState } from "@/server/forms";
import { createCommittee, updateCommittee } from "@/server/services/committees";
import { requirePermission } from "@/server/session";

export async function saveCommitteeAction(id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("content.manage");
  try {
    if (id) await updateCommittee(actor, id, formValues(formData));
    else await createCommittee(actor, formValues(formData));
  } catch (error) {
    return toFormState(error);
  }
  // Committee names also appear on announcements and events.
  updateTag(TAGS.committees);
  updateTag(TAGS.announcements);
  updateTag(TAGS.events);
  if (!id) redirect("/admin/committees");
  refresh();
  return { ok: true };
}
