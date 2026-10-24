"use server";

import { refresh, updateTag } from "next/cache";
import { isSiteContentKey } from "@/lib/site-content";
import { TAGS } from "@/server/cache-tags";
import { formValues, toFormState, type FormState } from "@/server/forms";
import { publishPrivacyNotice, saveSiteContent } from "@/server/services/site-content";
import { requirePermission } from "@/server/session";

export async function saveSiteContentAction(key: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("site.edit");
  if (!isSiteContentKey(key)) return { error: "invalid" };
  try {
    await saveSiteContent(actor, key, formValues(formData));
  } catch (error) {
    return toFormState(error);
  }
  updateTag(TAGS.site);
  refresh();
  return { ok: true };
}

export async function publishPrivacyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("site.edit");
  try {
    await publishPrivacyNotice(actor, formValues(formData));
  } catch (error) {
    return toFormState(error);
  }
  updateTag(TAGS.privacy);
  refresh();
  return { ok: true };
}
