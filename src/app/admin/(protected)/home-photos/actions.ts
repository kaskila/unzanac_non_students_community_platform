"use server";

import { refresh, updateTag } from "next/cache";
import { TAGS } from "@/server/cache-tags";
import { ServiceError } from "@/server/errors";
import { formValues, toFormState, type FormState } from "@/server/forms";
import { deleteSlide, finishSlideUpload, startSlideUpload, updateSlide } from "@/server/services/hero";
import { requirePermission } from "@/server/session";

export type SlideUploadStart = { uploadId: string; url: string; headers: Record<string, string> } | { error: string };

export async function startSlideUploadAction(alt: string, fileName: string, size: number): Promise<SlideUploadStart> {
  const actor = await requirePermission("site.edit");
  try {
    return await startSlideUpload(actor, { alt, fileName, size });
  } catch (error) {
    const state = toFormState(error);
    return { error: state.fieldErrors?.alt ? "alt_required" : (state.error ?? "generic") };
  }
}

export async function finishSlideUploadAction(uploadId: string): Promise<{ ok?: boolean; error?: string }> {
  const actor = await requirePermission("site.edit");
  try {
    await finishSlideUpload(actor, uploadId);
  } catch (error) {
    return { error: error instanceof ServiceError ? error.code : "generic" };
  }
  updateTag(TAGS.hero);
  refresh();
  return { ok: true };
}

export async function updateSlideAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("site.edit");
  try {
    await updateSlide(actor, id, formValues(formData));
  } catch (error) {
    return toFormState(error);
  }
  updateTag(TAGS.hero);
  refresh();
  return { ok: true };
}

export async function deleteSlideAction(id: string): Promise<void> {
  const actor = await requirePermission("site.edit");
  await deleteSlide(actor, id);
  updateTag(TAGS.hero);
  refresh();
}
