import { getFormatter, getTranslations } from "next-intl/server";
import { ui } from "@/components/admin/ui";
import { prisma } from "@/server/db";
import { requirePermission } from "@/server/session";

export default async function AuditPage() {
  await requirePermission("audit.view");
  const [t, format] = await Promise.all([getTranslations("Admin.audit"), getFormatter()]);

  const entries = await prisma.auditLog.findMany({ orderBy: { at: "desc" }, take: 200 });
  const actorIds = [...new Set(entries.map((e) => e.actorId).filter((id): id is string => !!id))];
  const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } });
  const names = new Map(actors.map((a) => [a.id, a.name]));

  return (
    <section className="space-y-4">
      <h1 className={ui.h1}>{t("title")}</h1>
      <p className={ui.muted}>{t("intro")}</p>
      {entries.length === 0 ? (
        <p>{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-azure-50">
              <tr>
                <th scope="col" className="p-2">{t("when")}</th>
                <th scope="col" className="p-2">{t("who")}</th>
                <th scope="col" className="p-2">{t("action")}</th>
                <th scope="col" className="p-2">{t("target")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-line align-top">
                  <td className="whitespace-nowrap p-2">
                    {format.dateTime(e.at, { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="p-2">{e.actorId ? (names.get(e.actorId) ?? e.actorId) : t("system")}</td>
                  <td className="p-2 font-mono">{e.action}</td>
                  <td className="p-2">
                    {e.entityType}
                    {e.meta ? <span className="block break-all text-muted">{JSON.stringify(e.meta)}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
