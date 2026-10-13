import { getTranslations } from "next-intl/server";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { CheckboxField, SelectField, TextArea, TextField } from "@/components/admin/fields";
import { localDateKey, toLocalInput } from "@/lib/dates";
import { parseRRule, RECURRENCE_CHOICES, recurrenceChoice } from "@/lib/recurrence";
import type { Event } from "@/generated/prisma/client";
import { saveEventAction } from "./actions";

export async function EventForm({
  event,
  committees,
  defaultVenue,
}: {
  event: Event | null;
  committees: { id: string; name: string }[];
  defaultVenue: string;
}) {
  const t = await getTranslations("Admin.events");
  const action = saveEventAction.bind(null, event?.id ?? null);
  const status = event?.status ?? null;
  const until = parseRRule(event?.rrule)?.until;

  return (
    <ActionForm action={action}>
      <TextField name="title" label={t("fields.title")} required maxLength={120} defaultValue={event?.title} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="startsAt"
          type="datetime-local"
          label={t("fields.startsAt")}
          required
          defaultValue={toLocalInput(event?.startsAt)}
        />
        <TextField name="endsAt" type="datetime-local" label={t("fields.endsAt")} required defaultValue={toLocalInput(event?.endsAt)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="recurrence"
          label={t("fields.recurrence")}
          hint={t("fields.recurrenceHint")}
          defaultValue={recurrenceChoice(event?.rrule)}
          options={RECURRENCE_CHOICES.map((c) => ({ value: c, label: t(`recurrence.${c}`) }))}
        />
        <TextField
          name="until"
          type="date"
          label={t("fields.until")}
          hint={t("fields.untilHint")}
          defaultValue={until ? localDateKey(until) : ""}
        />
      </div>
      <TextField name="venue" label={t("fields.venue")} required maxLength={150} defaultValue={event?.venue ?? defaultVenue} />
      <TextField
        name="mapUrl"
        type="url"
        inputMode="url"
        label={t("fields.mapUrl")}
        hint={t("fields.mapUrlHint")}
        defaultValue={event?.mapUrl}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="audience" label={t("fields.audience")} hint={t("fields.audienceHint")} maxLength={60} defaultValue={event?.audience} />
        <SelectField
          name="committeeId"
          label={t("fields.committee")}
          defaultValue={event?.committeeId ?? ""}
          options={[{ value: "", label: t("fields.noCommittee") }, ...committees.map((c) => ({ value: c.id, label: c.name }))]}
        />
      </div>
      <TextArea name="details" label={t("fields.details")} hint={t("fields.detailsHint")} rows={5} maxLength={5000} defaultValue={event?.details} />
      <CheckboxField name="isService" label={t("fields.isService")} hint={t("fields.isServiceHint")} defaultChecked={event?.isService} />
      <CheckboxField
        name="showInSchedule"
        label={t("fields.showInSchedule")}
        hint={t("fields.showInScheduleHint")}
        defaultChecked={event?.showInSchedule}
      />
      <div className="flex flex-wrap gap-3">
        {status === "PUBLISHED" ? (
          <>
            <SubmitButton name="intent" value="save">
              {t("actions.saveChanges")}
            </SubmitButton>
            <SubmitButton name="intent" value="unpublish" variant="secondary">
              {t("actions.unpublish")}
            </SubmitButton>
          </>
        ) : (
          <>
            <SubmitButton name="intent" value="publish">
              {t("actions.publish")}
            </SubmitButton>
            <SubmitButton name="intent" value={status === "ARCHIVED" ? "unpublish" : "save"} variant="secondary">
              {status === "ARCHIVED" ? t("actions.restore") : t("actions.saveDraft")}
            </SubmitButton>
          </>
        )}
        {status && status !== "ARCHIVED" && (
          <SubmitButton name="intent" value="archive" variant="danger">
            {t("actions.archive")}
          </SubmitButton>
        )}
      </div>
    </ActionForm>
  );
}
