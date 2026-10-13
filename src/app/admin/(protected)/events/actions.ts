"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/server/cache-tags";
import { formValues, toFormState, type FormState } from "@/server/forms";
import { clearOccurrenceException, saveEvent, setOccurrenceException } from "@/server/services/events";
import { requirePermission } from "@/server/session";

/** Create (id = null) or update an event. The submit button's `intent` decides the status. */
export async function saveEventAction(id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("content.manage");
  let createdId: string | null = null;
  try {
    const event = await saveEvent(actor, id, formValues(formData));
    if (!id) createdId = event.id;
  } catch (error) {
    return toFormState(error);
  }
  updateTag(TAGS.events);
  // New events open on their edit page, where single dates can be cancelled or moved.
  if (createdId) redirect(`/admin/events/${createdId}`);
  refresh();
  return { ok: true };
}

/** Cancel or move one date of a recurring event. */
export async function setDateAction(eventId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requirePermission("content.manage");
  try {
    await setOccurrenceException(actor, eventId, formValues(formData));
  } catch (error) {
    return toFormState(error);
  }
  updateTag(TAGS.events);
  refresh();
  return { ok: true };
}

/** Undo a cancellation or move. */
export async function restoreDateAction(eventId: string, exceptionId: string): Promise<void> {
  const actor = await requirePermission("content.manage");
  await clearOccurrenceException(actor, eventId, exceptionId);
  updateTag(TAGS.events);
  refresh();
}
