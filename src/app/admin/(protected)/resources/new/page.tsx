import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ui } from "@/components/admin/ui";
import { listCommitteesForAdmin } from "@/server/services/committees";
import { requirePermission } from "@/server/session";
import { MaterialForm } from "../material-form";

export default async function NewResourcePage() {
  await requirePermission("media.manage");
  const [t, committees] = await Promise.all([getTranslations("Admin.resources"), listCommitteesForAdmin()]);
  return (
    <div className="space-y-6">
      <p>
        <Link href="/admin/resources">{t("back")}</Link>
      </p>
      <h1 className={ui.h1}>{t("newTitle")}</h1>
      <p className={ui.muted}>{t("copyright")}</p>
      <MaterialForm material={null} committees={committees} />
    </div>
  );
}
