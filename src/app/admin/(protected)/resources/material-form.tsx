import { getTranslations } from "next-intl/server";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { SelectField, TextArea, TextField } from "@/components/admin/fields";
import { toLocalInput } from "@/lib/dates";
import type { Material } from "@/generated/prisma/client";
import { MATERIAL_CATEGORIES, MATERIAL_VISIBILITIES } from "@/server/services/materials";
import { saveMaterialAction } from "./actions";

export async function MaterialForm({ material, committees }: { material: Material | null; committees: { id: string; name: string }[] }) {
  const t = await getTranslations("Admin.resources");
  const tc = await getTranslations("Content");
  const status = material?.status ?? null;
  const hasFile = !!material?.currentFileId;

  return (
    <ActionForm action={saveMaterialAction.bind(null, material?.id ?? null)}>
      <TextField name="title" label={t("fields.title")} required maxLength={150} defaultValue={material?.title} />
      <TextArea name="description" label={t("fields.description")} rows={3} maxLength={2000} defaultValue={material?.description} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="category"
          label={t("fields.category")}
          defaultValue={material?.category ?? "NOTICES_FORMS"}
          options={MATERIAL_CATEGORIES.map((c) => ({ value: c, label: tc(`materialCategories.${c}`) }))}
        />
        <SelectField
          name="committeeId"
          label={t("fields.committee")}
          defaultValue={material?.committeeId ?? ""}
          options={[{ value: "", label: t("fields.none") }, ...committees.map((c) => ({ value: c.id, label: c.name }))]}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="visibility"
          label={t("fields.visibility")}
          hint={t("fields.visibilityHint")}
          defaultValue={material?.visibility ?? "PUBLIC"}
          options={MATERIAL_VISIBILITIES.map((v) => ({ value: v, label: t(`visibility.${v}`) }))}
        />
        <TextField
          name="expiresAt"
          type="datetime-local"
          label={t("fields.expiresAt")}
          hint={t("fields.expiresAtHint")}
          defaultValue={toLocalInput(material?.expiresAt)}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        {!material ? (
          <SubmitButton name="intent" value="save">
            {t("actions.createThenUpload")}
          </SubmitButton>
        ) : status === "PUBLISHED" ? (
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
            {hasFile && (
              <SubmitButton name="intent" value="publish">
                {t("actions.publish")}
              </SubmitButton>
            )}
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
