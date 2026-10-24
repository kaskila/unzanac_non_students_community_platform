"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/server/cache-tags";
import { formValues, toFormState, type FormState } from "@/server/forms";
import { addVideoFromUrl, importChannelUploads, updateVideo } from "@/server/services/videos";
import { requirePermission } from "@/server/session";

/** Paste a link → a draft video, then open it for categorising. */
export async function addVideoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("media.manage");
  let id: string;
  try {
    id = await addVideoFromUrl(actor, formValues(formData));
  } catch (error) {
    return toFormState(error);
  }
  redirect(`/admin/media/${id}`);
}

export async function updateVideoAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("media.manage");
  try {
    await updateVideo(actor, id, formValues(formData));
  } catch (error) {
    return toFormState(error);
  }
  updateTag(TAGS.videos);
  refresh();
  return { ok: true };
}

/** "Check for new uploads": the same import the daily cron runs. */
export async function importUploadsAction(): Promise<FormState> {
  const actor = await requirePermission("media.manage");
  try {
    await importChannelUploads(actor);
  } catch (error) {
    return toFormState(error);
  }
  refresh();
  return { ok: true };
}
