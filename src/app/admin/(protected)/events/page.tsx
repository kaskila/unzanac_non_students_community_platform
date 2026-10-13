import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/admin/fields";
import { ui } from "@/components/admin/ui";
import { recurrenceChoice } from "@/lib/recurrence";
import { listEventsForAdmin } from "@/server/services/events";
import { requirePermission } from "@/server/session";

export default async function EventsPage() {
  await requirePermission("content.manage");
  const [t, format, events] = await Promise.all([getTranslations("Admin.events"), getFormatter(), listEventsForAdmin()]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={ui.h1}>{t("title")}</h1>
        <Link href="/admin/events/new" className={ui.primary}>
          {t("new")}
        </Link>
      </div>
      {events.length === 0 ? (
        <p className={ui.muted}>{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => {
            const repeat = recurrenceChoice(e.rrule);
            return (
              <li key={e.id} className={ui.card}>
                <p className="font-bold">
                  <Link href={`/admin/events/${e.id}`}>{e.title}</Link>
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                  <StatusBadge tone={e.status === "PUBLISHED" ? "live" : e.status === "DRAFT" ? "draft" : "muted"}>
                    {t(`status.${e.status}`)}
                  </StatusBadge>
                  {e.isService && <StatusBadge tone="draft">{t("service")}</StatusBadge>}
                  <span>
                    {format.dateTime(e.startsAt, { dateStyle: "medium", timeStyle: "short" })}
                    {repeat !== "none" && ` · ${t(`recurrence.${repeat}`)}`}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
