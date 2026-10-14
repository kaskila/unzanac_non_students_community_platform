import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { CopyButton } from "@/components/admin/action-form";
import { StatusBadge } from "@/components/admin/fields";
import { ui } from "@/components/admin/ui";
import { formatBytes, kindLabel } from "@/lib/file-rules";
import { shareText } from "@/lib/share-text";
import { siteUrl } from "@/lib/site";
import { can } from "@/server/policy";
import { listCommitteesForAdmin } from "@/server/services/committees";
import { getMaterialForAdmin, PURGE_AFTER_DAYS } from "@/server/services/materials";
import { requirePermission } from "@/server/session";
import { deleteMaterialAction, restoreMaterialAction } from "../actions";
import { MaterialForm } from "../material-form";
import { UploadWidget } from "../upload-widget";

export default async function EditResourcePage({ params }: PageProps<"/admin/resources/[id]">) {
  const actor = await requirePermission("media.manage");
  const { id } = await params;
  const [t, format, material, committees] = await Promise.all([
    getTranslations("Admin.resources"),
    getFormatter(),
    getMaterialForAdmin(id),
    listCommitteesForAdmin(),
  ]);
  if (!material) notFound();

  const canDelete = can(actor, "resource.delete");
  const file = material.currentFile;
  const url = siteUrl(`/resources/${material.slug}`);
  const live = material.status === "PUBLISHED" && !material.deletedAt && !!file;

  if (material.deletedAt) {
    return (
      <div className="space-y-6">
        <p>
          <Link href="/admin/resources">{t("back")}</Link>
        </p>
        <h1 className={ui.h1}>{material.title}</h1>
        <p role="status" className={ui.error}>
          {t("deletedNotice", {
            date: format.dateTime(new Date(material.deletedAt.getTime() + PURGE_AFTER_DAYS * 86_400_000), { dateStyle: "long" }),
          })}
        </p>
        {canDelete && (
          <form action={restoreMaterialAction.bind(null, material.id)}>
            <button type="submit" className={ui.secondary}>
              {t("restore")}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p>
        <Link href="/admin/resources">{t("back")}</Link>
      </p>
      <div className="space-y-2">
        <h1 className={ui.h1}>{material.title}</h1>
        <p className="flex flex-wrap items-center gap-3">
          <StatusBadge tone={material.status === "PUBLISHED" ? "live" : material.status === "DRAFT" ? "draft" : "muted"}>
            {t(`status.${material.status}`)}
          </StatusBadge>
          <span className="text-muted" data-testid="download-count">
            {t("downloads", { count: material.downloadCount })}
          </span>
          {live && <a href={`/resources/${material.slug}`}>{t("viewPublic")}</a>}
        </p>
      </div>

      <section aria-labelledby="file-title" className={`${ui.card} space-y-3`}>
        <h2 id="file-title" className={ui.h2}>
          {t("fileTitle")}
        </h2>
        {file ? (
          <p>
            <span className="font-semibold">{file.fileName}</span> · {kindLabel(file.mimeType)} · {formatBytes(file.sizeBytes)}
          </p>
        ) : (
          <p className={ui.muted}>{t("noFileYet")}</p>
        )}
        <UploadWidget materialId={material.id} replacing={!!file} />
        {material.files.length > 1 && (
          <details>
            <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-azure-700 underline">
              {t("versions", { count: material.files.length })}
            </summary>
            <ul className="mt-2 space-y-1 text-sm">
              {material.files.map((f) => (
                <li key={f.id}>
                  {format.dateTime(f.uploadedAt, { dateStyle: "medium", timeStyle: "short" })} · {f.fileName} · {formatBytes(f.sizeBytes)}
                  {f.id === material.currentFileId && ` (${t("current")})`}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {live && (
        <section aria-labelledby="share-title" className={`${ui.card} space-y-3`}>
          <h2 id="share-title" className={ui.h2}>
            {t("shareTitle")}
          </h2>
          {(() => {
            const text = shareText({
              title: material.title,
              body: material.description,
              url,
              extra: `${kindLabel(file.mimeType)} · ${formatBytes(file.sizeBytes)}`,
            });
            return (
              <>
                <pre className="whitespace-pre-wrap rounded-md bg-azure-50 p-3 font-sans text-sm">{text}</pre>
                <CopyButton text={text} label={t("copyText")} copiedLabel={t("copied")} />
              </>
            );
          })()}
        </section>
      )}

      <section aria-labelledby="details-title" className="space-y-3">
        <h2 id="details-title" className={ui.h2}>
          {t("detailsTitle")}
        </h2>
        <MaterialForm material={material} committees={committees} />
      </section>

      {canDelete && (
        <section aria-labelledby="delete-title" className={`${ui.card} space-y-3`}>
          <h2 id="delete-title" className={ui.h2}>
            {t("deleteTitle")}
          </h2>
          <p className={ui.muted}>{t("deleteHelp", { days: PURGE_AFTER_DAYS })}</p>
          <form action={deleteMaterialAction.bind(null, material.id)}>
            <button type="submit" className={ui.danger}>
              {t("delete")}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
