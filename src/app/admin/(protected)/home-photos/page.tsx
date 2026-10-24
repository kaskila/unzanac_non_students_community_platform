import { getTranslations } from "next-intl/server";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { CheckboxField, StatusBadge, TextField } from "@/components/admin/fields";
import { ui } from "@/components/admin/ui";
import { heroImageUrl } from "@/lib/hero";
import { listSlidesForAdmin } from "@/server/services/hero";
import { requirePermission } from "@/server/session";
import { deleteSlideAction, updateSlideAction } from "./actions";
import { PhotoUpload } from "./photo-upload";

export default async function HomePhotosPage() {
  await requirePermission("site.edit");
  const [t, slides] = await Promise.all([getTranslations("Admin.homePhotos"), listSlidesForAdmin()]);
  const ready = slides.filter((s) => s.version);

  return (
    <div className="space-y-8">
      <h1 className={ui.h1}>{t("title")}</h1>
      <p className={ui.muted}>{t("intro")}</p>

      <section aria-labelledby="add-title" className={`${ui.card} space-y-3`}>
        <h2 id="add-title" className={ui.h2}>
          {t("addTitle")}
        </h2>
        <PhotoUpload />
      </section>

      <section aria-labelledby="photos-title" className="space-y-3">
        <h2 id="photos-title" className={ui.h2}>
          {t("listTitle")}
        </h2>
        {ready.length === 0 ? (
          <p className={ui.muted}>{t("empty")}</p>
        ) : (
          <ul className="space-y-4">
            {ready.map((slide, index) => (
              <li key={slide.id} className={`${ui.card} space-y-3`} data-testid="home-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImageUrl(slide.id, slide.version!, 480)} alt="" width={480} height={210} className="w-full max-w-sm rounded" />
                {!slide.active && <StatusBadge tone="muted">{t("hidden")}</StatusBadge>}
                <ActionForm action={updateSlideAction.bind(null, slide.id)}>
                  <TextField id={`alt-${index}`} name="alt" label={t("alt")} maxLength={200} defaultValue={slide.alt} />
                  <TextField
                    id={`order-${index}`}
                    name="sortOrder"
                    type="number"
                    inputMode="numeric"
                    label={t("order")}
                    hint={t("orderHint")}
                    defaultValue={slide.sortOrder}
                  />
                  <CheckboxField id={`active-${index}`} name="active" label={t("active")} defaultChecked={slide.active} />
                  <SubmitButton variant="secondary">
                    {t("save")} <span className="sr-only">({slide.alt})</span>
                  </SubmitButton>
                </ActionForm>
                <form action={deleteSlideAction.bind(null, slide.id)}>
                  <button type="submit" className={ui.danger}>
                    {t("delete")} <span className="sr-only">({slide.alt})</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
