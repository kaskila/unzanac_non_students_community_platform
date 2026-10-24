import { getTranslations } from "next-intl/server";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { CheckboxField, TextArea, TextField } from "@/components/admin/fields";
import type { Committee } from "@/generated/prisma/client";
import { saveCommitteeAction } from "./actions";

export async function CommitteeForm({ committee, nextSortOrder = 0 }: { committee: Committee | null; nextSortOrder?: number }) {
  const t = await getTranslations("Admin.committees");
  const action = saveCommitteeAction.bind(null, committee?.id ?? null);
  return (
    <ActionForm action={action}>
      <TextField name="name" label={t("fields.name")} required maxLength={80} defaultValue={committee?.name} />
      {!committee && <TextField name="slug" label={t("fields.slug")} hint={t("fields.slugHint")} maxLength={60} />}
      <TextArea name="description" label={t("fields.description")} hint={t("fields.descriptionHint")} rows={4} maxLength={1000} defaultValue={committee?.description} />
      <TextField name="meetingInfo" label={t("fields.meetingInfo")} hint={t("fields.meetingInfoHint")} maxLength={200} defaultValue={committee?.meetingInfo} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="contactName" label={t("fields.contactName")} maxLength={80} defaultValue={committee?.contactName} />
        <TextField
          name="contactPhone"
          type="tel"
          inputMode="tel"
          label={t("fields.contactPhone")}
          hint={t("fields.phoneHint")}
          defaultValue={committee?.contactPhone}
        />
      </div>
      <TextField
        name="sortOrder"
        type="number"
        inputMode="numeric"
        label={t("fields.sortOrder")}
        hint={t("fields.sortOrderHint")}
        defaultValue={committee?.sortOrder ?? nextSortOrder}
      />
      <CheckboxField name="isPublic" label={t("fields.isPublic")} hint={t("fields.isPublicHint")} defaultChecked={committee?.isPublic ?? true} />
      <SubmitButton>{committee ? t("save") : t("create")}</SubmitButton>
    </ActionForm>
  );
}
