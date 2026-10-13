import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CopyButton } from "@/components/admin/action-form";
import { StatusBadge } from "@/components/admin/fields";
import { ui } from "@/components/admin/ui";
import { shareText } from "@/lib/share-text";
import { siteUrl } from "@/lib/site";
import { announcementState, getAnnouncementForAdmin } from "@/server/services/announcements";
import { listCommitteesForAdmin } from "@/server/services/committees";
import { requirePermission } from "@/server/session";
import { AnnouncementForm } from "../announcement-form";

export default async function EditAnnouncementPage({ params }: PageProps<"/admin/announcements/[id]">) {
  await requirePermission("content.manage");
  const { id } = await params;
  const [t, announcement, committees] = await Promise.all([
    getTranslations("Admin.announcements"),
    getAnnouncementForAdmin(id),
    listCommitteesForAdmin(),
  ]);
  if (!announcement) notFound();

  const state = announcementState(announcement);
  const url = siteUrl(`/announcements/${announcement.slug}`);
  const text = shareText({ title: announcement.title, body: announcement.body, url });

  return (
    <div className="space-y-6">
      <p>
        <Link href="/admin/announcements">{t("back")}</Link>
      </p>
      <div className="space-y-2">
        <h1 className={ui.h1}>{announcement.title}</h1>
        <p className="flex flex-wrap items-center gap-3">
          <StatusBadge tone={state === "live" ? "live" : state === "scheduled" ? "warning" : "draft"}>
            {t(`states.${state}`)}
          </StatusBadge>
          {state === "live" && <a href={`/announcements/${announcement.slug}`}>{t("viewPublic")}</a>}
        </p>
      </div>
      {state === "live" && (
        <section aria-labelledby="share-title" className={`${ui.card} space-y-3`}>
          <h2 id="share-title" className={ui.h2}>
            {t("shareTitle")}
          </h2>
          <p className={ui.muted}>{t("shareHelp")}</p>
          <pre className="whitespace-pre-wrap rounded-md bg-azure-50 p-3 font-sans text-sm">{text}</pre>
          <CopyButton text={text} label={t("copyText")} copiedLabel={t("copied")} />
        </section>
      )}
      <AnnouncementForm announcement={announcement} committees={committees} />
    </div>
  );
}
