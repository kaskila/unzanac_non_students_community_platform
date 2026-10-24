import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { ui } from "@/components/admin/ui";
import { prisma } from "@/server/db";
import { can } from "@/server/policy";
import { requireActor } from "@/server/session";

const DAY_MS = 86_400_000;
const QUIET_DAYS = 7;

export default async function DashboardPage() {
  const actor = await requireActor();
  const [t, format] = await Promise.all([getTranslations("Admin"), getFormatter()]);
  const now = new Date();

  const [live, drafts, expiringSoon, lastPost] = await Promise.all([
    prisma.announcement.count({
      where: { status: "PUBLISHED", publishAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    }),
    prisma.announcement.count({ where: { status: "DRAFT" } }),
    prisma.announcement.findMany({
      where: { status: "PUBLISHED", expiresAt: { gt: now, lte: new Date(now.getTime() + 3 * DAY_MS) } },
      select: { id: true, title: true, expiresAt: true },
      orderBy: { expiresAt: "asc" },
    }),
    prisma.announcement.findFirst({
      where: { status: "PUBLISHED", publishAt: { lte: now } },
      orderBy: { publishAt: "desc" },
      select: { publishAt: true },
    }),
  ]);
  const quiet = !lastPost?.publishAt || now.getTime() - lastPost.publishAt.getTime() > QUIET_DAYS * DAY_MS;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className={ui.h1}>{t("dashboard.welcome", { name: actor.name })}</h1>
        <p>{t("dashboard.role", { role: t(`roles.${actor.role}`) })}</p>
      </section>

      {can(actor, "content.manage") && (
        <>
          {quiet && (
            <p role="status" className="rounded-md border-l-4 border-warning bg-azure-50 p-3 text-warning">
              {t("dashboard.quiet", { days: QUIET_DAYS })}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/announcements/new" className={ui.primary}>
              {t("dashboard.newAnnouncement")}
            </Link>
            <Link href="/admin/events/new" className={ui.secondary}>
              {t("dashboard.newEvent")}
            </Link>
          </div>
          <dl className={`${ui.card} grid grid-cols-2 gap-4`}>
            <div>
              <dt className="text-sm text-muted">{t("dashboard.live")}</dt>
              <dd className="text-2xl font-bold text-azure-900">{live}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{t("dashboard.drafts")}</dt>
              <dd className="text-2xl font-bold text-azure-900">{drafts}</dd>
            </div>
          </dl>
          {expiringSoon.length > 0 && (
            <section aria-labelledby="expiring-title" className="space-y-2">
              <h2 id="expiring-title" className={ui.h2}>
                {t("dashboard.expiring")}
              </h2>
              <ul className="space-y-1">
                {expiringSoon.map((a) => (
                  <li key={a.id}>
                    <Link href={`/admin/announcements/${a.id}`}>{a.title}</Link>{" "}
                    <span className="text-sm text-muted">
                      ({format.dateTime(a.expiresAt!, { dateStyle: "medium", timeStyle: "short" })})
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
