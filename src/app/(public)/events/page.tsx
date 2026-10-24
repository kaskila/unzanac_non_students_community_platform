import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { NavLink } from "@/components/public/nav-link";
import { ScheduleList } from "@/components/public/schedule";
import { OccurrenceBadges, PageHeader, pub } from "@/components/public/ui";
import { localDateKey } from "@/lib/dates";
import { getRegularSchedule, getUpcomingEvents, type DatedEvent } from "@/server/public";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Events");
  return { title: t("title") };
}

/** Upcoming events as a list grouped by day (not a calendar grid: easier on a small screen). */
export default async function EventsPage() {
  const [t, format, upcoming, schedule] = await Promise.all([
    getTranslations("Events"),
    getFormatter(),
    getUpcomingEvents(60),
    getRegularSchedule(),
  ]);

  const days = new Map<string, DatedEvent[]>();
  for (const item of upcoming) {
    const key = localDateKey(item.occurrence.start);
    days.set(key, [...(days.get(key) ?? []), item]);
  }

  return (
    <div className={pub.container}>
      <PageHeader title={t("title")} intro={t("intro")} />
      {days.size === 0 ? (
        <p className={pub.muted}>{t("empty")}</p>
      ) : (
        <div className="space-y-6">
          {[...days.values()].map((items) => {
            const day = items[0].occurrence.start;
            return (
              <section key={day.toISOString()} aria-labelledby={`day-${localDateKey(day)}`}>
                <h2 id={`day-${localDateKey(day)}`} className={`${pub.h3} mb-2`}>
                  {format.dateTime(day, { weekday: "long", day: "numeric", month: "long" })}
                </h2>
                <ul className="space-y-2">
                  {items.map(({ event, occurrence }) => (
                    <li key={`${event.slug}-${occurrence.originalStart.toISOString()}`} className={pub.card}>
                      <p className="font-semibold">
                        {format.dateTimeRange(occurrence.start, occurrence.end, { hour: "numeric", minute: "2-digit" })} ·{" "}
                        <NavLink href={`/events/${event.slug}`}>{event.title}</NavLink>
                      </p>
                      <p className="text-sm text-muted">
                        {event.venue}
                        {event.audience && ` · ${event.audience}`}
                      </p>
                      <OccurrenceBadges cancelled={occurrence.cancelled} moved={occurrence.moved} note={occurrence.note} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      {schedule.length > 0 && (
        <section aria-labelledby="schedule-title" className="pt-10">
          <h2 id="schedule-title" className={`${pub.h2} mb-4`}>
            {t("scheduleTitle")}
          </h2>
          <ScheduleList events={schedule} />
        </section>
      )}
    </div>
  );
}
