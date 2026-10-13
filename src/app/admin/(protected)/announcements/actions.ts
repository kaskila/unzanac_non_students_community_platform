"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/server/cache-tags";
import { formValues, toFormState, type FormState } from "@/server/forms";
import { saveAnnouncement } from "@/server/services/announcements";
import { requirePermission } from "@/server/session";

/** Create (id = null) or update an announcement. The submit button's `intent` decides the status. */
export async function saveAnnouncementAction(id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("content.manage");
  try {
    await saveAnnouncement(actor, id, formValues(formData));
  } catch (error) {
    return toFormState(error);
  }
  updateTag(TAGS.announcements);
  if (!id) redirect("/admin/announcements");
  refresh();
  return { ok: true };
}
