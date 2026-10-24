import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ui } from "@/components/admin/ui";
import { listCommitteesForAdmin } from "@/server/services/committees";
import { requirePermission } from "@/server/session";
import { AnnouncementForm } from "../announcement-form";

export default async function NewAnnouncementPage() {
  await requirePermission("content.manage");
  const [t, committees] = await Promise.all([getTranslations("Admin.announcements"), listCommitteesForAdmin()]);
  return (
    <div className="space-y-6">
      <p>
        <Link href="/admin/announcements">{t("back")}</Link>
      </p>
      <h1 className={ui.h1}>{t("newTitle")}</h1>
      <AnnouncementForm announcement={null} committees={committees} />
    </div>
  );
}
