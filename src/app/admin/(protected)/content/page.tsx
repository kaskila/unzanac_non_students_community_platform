import type { ReactNode } from "react";
import { getFormatter, getTranslations } from "next-intl/server";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { CheckboxField, TextArea, TextField } from "@/components/admin/fields";
import { ui } from "@/components/admin/ui";
import { formatPhone } from "@/lib/phone";
import type { SiteContentKey } from "@/lib/site-content";
import { latestPrivacyNotice, readSiteContent } from "@/server/services/site-content";
import { requirePermission } from "@/server/session";
import { publishPrivacyAction, saveSiteContentAction } from "./actions";

const CONTACT_ROWS = 6;

export default async function SiteContentPage() {
  await requirePermission("site.edit");
  const [t, format, site, privacy] = await Promise.all([
    getTranslations("Admin.content"),
    getFormatter(),
    readSiteContent(),
    latestPrivacyNotice(),
  ]);

  // One card per site content key, each with its own form.
  const section = (id: SiteContentKey, children: ReactNode) => (
    <section aria-labelledby={`${id}-title`} className={`${ui.card} space-y-3`}>
      <h2 id={`${id}-title`} className={ui.h2}>
        {t(`${id}.title`)}
      </h2>
      <p className={ui.muted}>{t(`${id}.intro`)}</p>
      <ActionForm action={saveSiteContentAction.bind(null, id)}>
        {children}
        <SubmitButton>{t("save")}</SubmitButton>
      </ActionForm>
    </section>
  );

  return (
    <div className="space-y-6">
      <h1 className={ui.h1}>{t("title")}</h1>
      <p className={ui.muted}>{t("intro")}</p>

      {section("hero", <>
        <TextField name="title" label={t("hero.heading")} hint={t("hero.headingHint")} maxLength={80} defaultValue={site.hero.title} />
        <TextArea id="field-hero-body" name="body" label={t("hero.body")} rows={3} maxLength={300} defaultValue={site.hero.body} />
      </>)}

      {section("location", <>
        <TextField name="name" label={t("location.name")} maxLength={100} defaultValue={site.location.name} />
        <TextField name="address" label={t("location.address")} hint={t("location.addressHint")} maxLength={200} defaultValue={site.location.address} />
        <TextField name="mapUrl" type="url" inputMode="url" label={t("location.mapUrl")} hint={t("location.mapUrlHint")} defaultValue={site.location.mapUrl} />
      </>)}

      {section("visit", <>
        <TextArea id="field-visit-body" name="body" label={t("visit.body")} hint={t("markdownHint")} rows={10} maxLength={4000} defaultValue={site.visit.body} />
      </>)}

      {section("contacts", <>
        {Array.from({ length: CONTACT_ROWS }, (_, i) => {
          const c = site.contacts.items[i];
          return (
            <fieldset key={i} className="space-y-3 rounded-md border border-line p-3">
              <legend className="px-1 font-semibold">{t("contacts.row", { n: i + 1 })}</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                <TextField name={`contacts.${i}.role`} label={t("contacts.role")} maxLength={60} defaultValue={c?.role} />
                <TextField name={`contacts.${i}.name`} label={t("contacts.name")} maxLength={80} defaultValue={c?.name} />
                <TextField
                  name={`contacts.${i}.phone`}
                  type="tel"
                  inputMode="tel"
                  label={t("contacts.phone")}
                  defaultValue={c ? formatPhone(c.phone) : ""}
                />
              </div>
              <CheckboxField name={`contacts.${i}.whatsapp`} label={t("contacts.whatsapp")} defaultChecked={c?.whatsapp ?? true} />
            </fieldset>
          );
        })}
      </>)}

      {section("social", <>
        <TextField name="youtube" type="url" inputMode="url" label={t("social.youtube")} defaultValue={site.social.youtube} />
        <TextField name="facebook" type="url" inputMode="url" label={t("social.facebook")} hint={t("social.facebookHint")} defaultValue={site.social.facebook} />
        <TextField name="whatsappChannel" type="url" inputMode="url" label={t("social.whatsappChannel")} defaultValue={site.social.whatsappChannel} />
      </>)}

      {section("verse", <>
        <TextArea name="text" label={t("verse.text")} hint={t("verse.textHint")} rows={3} maxLength={400} defaultValue={site.verse.text} />
        <TextField name="reference" label={t("verse.reference")} maxLength={60} defaultValue={site.verse.reference} />
      </>)}

      <section aria-labelledby="privacy-title" className={`${ui.card} space-y-3`}>
        <h2 id="privacy-title" className={ui.h2}>
          {t("privacy.title")}
        </h2>
        <p className={ui.muted}>
          {privacy
            ? t("privacy.current", {
                version: privacy.version,
                date: format.dateTime(privacy.publishedAt, { dateStyle: "medium" }),
              })
            : t("privacy.none")}
        </p>
        <p className={ui.muted}>{t("privacy.intro")}</p>
        <ActionForm action={publishPrivacyAction} savedMessage={t("privacy.published")}>
          <TextArea id="field-privacy-body" name="body" label={t("privacy.body")} hint={t("markdownHint")} rows={14} maxLength={20000} defaultValue={privacy?.body} />
          <SubmitButton>{t("privacy.publish")}</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
