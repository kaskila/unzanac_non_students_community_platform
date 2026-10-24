import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ui } from "@/components/admin/ui";
import { listCommitteesForAdmin } from "@/server/services/committees";
import { requirePermission } from "@/server/session";
import { CommitteeForm } from "../committee-form";

export default async function NewCommitteePage() {
  await requirePermission("content.manage");
  const [t, committees] = await Promise.all([getTranslations("Admin.committees"), listCommitteesForAdmin()]);
  const nextSortOrder = Math.max(-1, ...committees.map((c) => c.sortOrder)) + 1;
  return (
    <div className="space-y-6">
      <p>
        <Link href="/admin/committees">{t("back")}</Link>
      </p>
      <h1 className={ui.h1}>{t("newTitle")}</h1>
      <CommitteeForm committee={null} nextSortOrder={nextSortOrder} />
    </div>
  );
}
