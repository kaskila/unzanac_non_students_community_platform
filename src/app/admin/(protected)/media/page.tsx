import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { StatusBadge, TextField } from "@/components/admin/fields";
import { ui } from "@/components/admin/ui";
import { readSiteContent } from "@/server/services/site-content";
import { listVideosForAdmin } from "@/server/services/videos";
import { requirePermission } from "@/server/session";
import { addVideoAction, importUploadsAction } from "./actions";

export default async function MediaPage() {
  await requirePermission("media.manage");
  const [t, format, videos, site] = await Promise.all([
    getTranslations("Admin.media"),
    getFormatter(),
    listVideosForAdmin(),
    readSiteContent(),
  ]);

  return (
    <div className="space-y-8">
      <h1 className={ui.h1}>{t("title")}</h1>

      <section aria-labelledby="add-title" className={`${ui.card} space-y-3`}>
        <h2 id="add-title" className={ui.h2}>
          {t("addTitle")}
        </h2>
        <ActionForm action={addVideoAction}>
          <TextField name="url" type="url" inputMode="url" label={t("url")} hint={t("urlHint")} required />
          <SubmitButton>{t("add")}</SubmitButton>
        </ActionForm>
      </section>

      <section aria-labelledby="import-title" className={`${ui.card} space-y-3`}>
        <h2 id="import-title" className={ui.h2}>
          {t("importTitle")}
        </h2>
        {site.social.youtubeChannelId ? (
          <ActionForm action={importUploadsAction} savedMessage={t("imported")}>
            <p className={ui.muted}>{t("importHelp")}</p>
            <SubmitButton variant="secondary">{t("import")}</SubmitButton>
          </ActionForm>
        ) : (
          <p className={ui.muted}>
            {t("noChannel")} <Link href="/admin/content">{t("setChannel")}</Link>
          </p>
        )}
      </section>

      <section aria-labelledby="videos-title" className="space-y-3">
        <h2 id="videos-title" className={ui.h2}>
          {t("listTitle")}
        </h2>
        {videos.length === 0 ? (
          <p className={ui.muted}>{t("empty")}</p>
        ) : (
          <ul className="space-y-3">
            {videos.map((v) => (
              <li key={v.id} className={`${ui.card} flex gap-3`}>
                {v.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbnailUrl} alt="" width={96} height={54} loading="lazy" className="h-[54px] w-24 shrink-0 rounded object-cover" />
                )}
                <div className="min-w-0 space-y-1">
                  <p className="font-bold">
                    <Link href={`/admin/media/${v.id}`}>{v.title}</Link>
                  </p>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                    <StatusBadge tone={v.status === "PUBLISHED" ? "live" : v.status === "DRAFT" ? "draft" : "muted"}>
                      {t(`status.${v.status}`)}
                    </StatusBadge>
                    {v.featured && <StatusBadge tone="warning">{t("featured")}</StatusBadge>}
                    {v.importedAt && <span>{t("fromChannel")}</span>}
                    {v.source === "FACEBOOK" && <span>Facebook</span>}
                    {v.recordedAt && <span>{format.dateTime(v.recordedAt, { dateStyle: "medium" })}</span>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
