import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/admin/fields";
import { ui } from "@/components/admin/ui";
import { formatBytes, kindLabel } from "@/lib/file-rules";
import { listMaterialsForAdmin } from "@/server/services/materials";
import { requirePermission } from "@/server/session";

export default async function ResourcesPage() {
  await requirePermission("media.manage");
  const [t, materials] = await Promise.all([getTranslations("Admin.resources"), listMaterialsForAdmin()]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={ui.h1}>{t("title")}</h1>
        <Link href="/admin/resources/new" className={ui.primary}>
          {t("new")}
        </Link>
      </div>
      <p className={ui.muted}>{t("intro")}</p>
      {materials.length === 0 ? (
        <p className={ui.muted}>{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {materials.map((m) => (
            <li key={m.id} className={ui.card}>
              <p className="font-bold">
                <Link href={`/admin/resources/${m.id}`}>{m.title}</Link>
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                {m.deletedAt ? (
                  <StatusBadge tone="warning">{t("deleted")}</StatusBadge>
                ) : (
                  <StatusBadge tone={m.status === "PUBLISHED" ? "live" : m.status === "DRAFT" ? "draft" : "muted"}>
                    {t(`status.${m.status}`)}
                  </StatusBadge>
                )}
                {m.visibility === "UNLISTED" && <StatusBadge tone="muted">{t("visibility.UNLISTED")}</StatusBadge>}
                <span>
                  {m.currentFile ? `${kindLabel(m.currentFile.mimeType)} · ${formatBytes(m.currentFile.sizeBytes)}` : t("noFile")}
                </span>
                <span>{t("downloads", { count: m.downloadCount })}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
