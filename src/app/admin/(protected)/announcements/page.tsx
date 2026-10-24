import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/admin/fields";
import { ui } from "@/components/admin/ui";
import { announcementState, listAnnouncementsForAdmin, type AnnouncementState } from "@/server/services/announcements";
import { requirePermission } from "@/server/session";

const TONE: Record<AnnouncementState, "live" | "draft" | "muted" | "warning"> = {
  live: "live",
  scheduled: "warning",
  draft: "draft",
  expired: "muted",
  archived: "muted",
};

export default async function AnnouncementsPage() {
  await requirePermission("content.manage");
  const [t, format, announcements] = await Promise.all([
    getTranslations("Admin.announcements"),
    getFormatter(),
    listAnnouncementsForAdmin(),
  ]);
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={ui.h1}>{t("title")}</h1>
        <Link href="/admin/announcements/new" className={ui.primary}>
          {t("new")}
        </Link>
      </div>
      {announcements.length === 0 ? (
        <p className={ui.muted}>{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {announcements.map((a) => {
            const state = announcementState(a, now);
            return (
              <li key={a.id} className={`${ui.card} flex flex-wrap items-center justify-between gap-3`}>
                <div className="min-w-0 space-y-1">
                  <p className="font-bold">
                    <Link href={`/admin/announcements/${a.id}`}>{a.title}</Link>
                  </p>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                    <StatusBadge tone={TONE[state]}>{t(`states.${state}`)}</StatusBadge>
                    {a.pinned && <StatusBadge tone="draft">{t("pinned")}</StatusBadge>}
                    {a.publishAt && <span>{format.dateTime(a.publishAt, { dateStyle: "medium", timeStyle: "short" })}</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
