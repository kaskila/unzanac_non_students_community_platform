import { getTranslations } from "next-intl/server";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { CheckboxField, SelectField, TextArea, TextField } from "@/components/admin/fields";
import { toLocalInput } from "@/lib/dates";
import type { Announcement } from "@/generated/prisma/client";
import { ANNOUNCEMENT_CATEGORIES } from "@/server/services/announcements";
import { saveAnnouncementAction } from "./actions";

export async function AnnouncementForm({
  announcement,
  committees,
}: {
  announcement: Announcement | null;
  committees: { id: string; name: string }[];
}) {
  const t = await getTranslations("Admin.announcements");
  const tc = await getTranslations("Content");
  const action = saveAnnouncementAction.bind(null, announcement?.id ?? null);
  const status = announcement?.status ?? null;

  return (
    <ActionForm action={action}>
      <TextField name="title" label={t("fields.title")} required maxLength={120} defaultValue={announcement?.title} />
      <TextArea
        name="body"
        label={t("fields.body")}
        hint={t("fields.bodyHint")}
        required
        rows={8}
        maxLength={5000}
        defaultValue={announcement?.body}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="category"
          label={t("fields.category")}
          defaultValue={announcement?.category ?? "GENERAL"}
          options={ANNOUNCEMENT_CATEGORIES.map((c) => ({ value: c, label: tc(`categories.${c}`) }))}
        />
        <SelectField
          name="committeeId"
          label={t("fields.committee")}
          defaultValue={announcement?.committeeId ?? ""}
          options={[{ value: "", label: t("fields.noCommittee") }, ...committees.map((c) => ({ value: c.id, label: c.name }))]}
        />
      </div>
      <CheckboxField name="pinned" label={t("fields.pinned")} hint={t("fields.pinnedHint")} defaultChecked={announcement?.pinned} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="publishAt"
          type="datetime-local"
          label={t("fields.publishAt")}
          hint={t("fields.publishAtHint")}
          defaultValue={toLocalInput(announcement?.publishAt)}
        />
        <TextField
          name="expiresAt"
          type="datetime-local"
          label={t("fields.expiresAt")}
          hint={t("fields.expiresAtHint")}
          defaultValue={toLocalInput(announcement?.expiresAt)}
        />
      </div>
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
