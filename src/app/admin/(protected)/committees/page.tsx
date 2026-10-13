import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/admin/fields";
import { ui } from "@/components/admin/ui";
import { listCommitteesForAdmin } from "@/server/services/committees";
import { requirePermission } from "@/server/session";

export default async function CommitteesPage() {
  await requirePermission("content.manage");
  const [t, committees] = await Promise.all([getTranslations("Admin.committees"), listCommitteesForAdmin()]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={ui.h1}>{t("title")}</h1>
        <Link href="/admin/committees/new" className={ui.primary}>
          {t("new")}
        </Link>
      </div>
      <p className={ui.muted}>{t("intro")}</p>
      <ul className="space-y-3">
        {committees.map((c) => (
          <li key={c.id} className={`${ui.card} flex flex-wrap items-center justify-between gap-3`}>
            <div>
              <p className="font-bold">
                <Link href={`/admin/committees/${c.id}`}>{c.name}</Link>
              </p>
              <p className="text-sm text-muted">{c.meetingInfo ?? t("noMeetingInfo")}</p>
            </div>
            {!c.isPublic && <StatusBadge tone="muted">{t("hidden")}</StatusBadge>}
          </li>
        ))}
      </ul>
    </div>
  );
}
