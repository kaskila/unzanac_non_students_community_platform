"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/server/cache-tags";
import { ServiceError } from "@/server/errors";
import { formValues, toFormState, type FormState } from "@/server/forms";
import { confirmUpload, deleteMaterial, requestUpload, restoreMaterial, saveMaterial } from "@/server/services/materials";
import { requirePermission } from "@/server/session";

/** Create (id = null) or update a resource's details. New resources open on their edit page for the upload. */
export async function saveMaterialAction(id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("media.manage");
  let createdId: string | null = null;
  try {
    const material = await saveMaterial(actor, id, formValues(formData));
    if (!id) createdId = material.id;
  } catch (error) {
    return toFormState(error);
  }
  updateTag(TAGS.materials);
  if (createdId) redirect(`/admin/resources/${createdId}`);
  refresh();
  return { ok: true };
}

export type UploadStart = { uploadId: string; url: string; headers: Record<string, string> } | { error: string };

export async function startUploadAction(materialId: string, fileName: string, size: number): Promise<UploadStart> {
  const actor = await requirePermission("media.manage");
  try {
    return await requestUpload(actor, materialId, { fileName, size });
  } catch (error) {
    return { error: toFormState(error).error ?? "generic" };
  }
}

export async function finishUploadAction(uploadId: string): Promise<{ ok?: boolean; error?: string }> {
  const actor = await requirePermission("media.manage");
  try {
    await confirmUpload(actor, uploadId);
  } catch (error) {
    return { error: error instanceof ServiceError ? error.code : (toFormState(error).error ?? "generic") };
  }
  updateTag(TAGS.materials);
  refresh();
  return { ok: true };
}

export async function deleteMaterialAction(id: string): Promise<void> {
  const actor = await requirePermission("resource.delete");
  await deleteMaterial(actor, id);
  updateTag(TAGS.materials);
  refresh();
}

export async function restoreMaterialAction(id: string): Promise<void> {
  const actor = await requirePermission("resource.delete");
  await restoreMaterial(actor, id);
  updateTag(TAGS.materials);
  refresh();
}
