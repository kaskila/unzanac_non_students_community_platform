import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { CheckboxField, SelectField, StatusBadge, TextArea, TextField } from "@/components/admin/fields";
import { ui } from "@/components/admin/ui";
import { toLocalInput } from "@/lib/dates";
import { youTubeAppUrl } from "@/lib/video-links";
import { prisma } from "@/server/db";
import { listCommitteesForAdmin } from "@/server/services/committees";
import { getVideoForAdmin, VIDEO_CATEGORIES } from "@/server/services/videos";
import { requirePermission } from "@/server/session";
import { updateVideoAction } from "../actions";

export default async function EditVideoPage({ params }: PageProps<"/admin/media/[id]">) {
  await requirePermission("media.manage");
  const { id } = await params;
  const [t, tc, video, committees, events] = await Promise.all([
    getTranslations("Admin.media"),
    getTranslations("Content"),
    getVideoForAdmin(id),
    listCommitteesForAdmin(),
    prisma.event.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { startsAt: "desc" }, take: 100, select: { id: true, title: true } }),
  ]);
  if (!video) notFound();

  const sourceUrl = video.source === "YOUTUBE" ? youTubeAppUrl(video.kind, video.externalId) : video.externalId;
  const status = video.status;

  return (
    <div className="space-y-6">
      <p>
        <Link href="/admin/media">{t("back")}</Link>
      </p>
      <div className="space-y-2">
        <h1 className={ui.h1}>{video.title}</h1>
        <p className="flex flex-wrap items-center gap-3">
          <StatusBadge tone={status === "PUBLISHED" ? "live" : status === "DRAFT" ? "draft" : "muted"}>{t(`status.${status}`)}</StatusBadge>
          <a href={sourceUrl} rel="noopener">
            {video.source === "YOUTUBE" ? t("openYouTube") : t("openFacebook")}
          </a>
          {status === "PUBLISHED" && <a href={`/watch/${video.slug}`}>{t("viewPublic")}</a>}
        </p>
      </div>
      {video.thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={video.thumbnailUrl} alt="" width={320} height={180} className="rounded-lg" />
      )}
      <ActionForm action={updateVideoAction.bind(null, video.id)}>
        <TextField name="title" label={t("fields.title")} required maxLength={200} defaultValue={video.title} />
        <TextArea name="description" label={t("fields.description")} rows={4} maxLength={2000} defaultValue={video.description} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="category"
            label={t("fields.category")}
            defaultValue={video.category}
            options={VIDEO_CATEGORIES.map((c) => ({ value: c, label: tc(`videoCategories.${c}`) }))}
          />
          <TextField name="recordedAt" type="datetime-local" label={t("fields.recordedAt")} defaultValue={toLocalInput(video.recordedAt)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="eventId"
            label={t("fields.event")}
            defaultValue={video.eventId ?? ""}
            options={[{ value: "", label: t("fields.none") }, ...events.map((e) => ({ value: e.id, label: e.title }))]}
          />
          <SelectField
            name="committeeId"
            label={t("fields.committee")}
            defaultValue={video.committeeId ?? ""}
            options={[{ value: "", label: t("fields.none") }, ...committees.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </div>
        <CheckboxField name="featured" label={t("fields.featured")} hint={t("fields.featuredHint")} defaultChecked={video.featured} />
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
          {status !== "ARCHIVED" && (
            <SubmitButton name="intent" value="archive" variant="danger">
              {t("actions.archive")}
            </SubmitButton>
          )}
        </div>
      </ActionForm>
    </div>
  );
}
