import { getFormatter, getTranslations } from "next-intl/server";
import { NavLink } from "@/components/public/nav-link";
import { pub } from "@/components/public/ui";
import { toWallClock } from "@/lib/dates";
import { parseRRule } from "@/lib/recurrence";

type ScheduleEvent = { slug: string; title: string; venue: string; startsAt: Date; endsAt: Date; rrule: string | null };

/** The regular schedule: "Every Sunday · 9:00 – 10:30 am · Divine service". */
export async function ScheduleList({ events }: { events: readonly ScheduleEvent[] }) {
  const [t, format] = await Promise.all([getTranslations("Content.schedule"), getFormatter()]);

  const pattern = (event: ScheduleEvent) => {
    const rule = parseRRule(event.rrule);
    const weekday = format.dateTime(event.startsAt, { weekday: "long" });
    if (!rule) return "";
    if (rule.freq === "WEEKLY") return rule.interval === 2 ? t("fortnightly", { weekday }) : t("weekly", { weekday });
    if ("monthDay" in rule) return t("monthlyDate", { day: toWallClock(event.startsAt).getUTCDate() });
    return rule.nth === -1 ? t("monthlyLast", { weekday }) : t("monthlyNth", { nth: rule.nth, weekday });
  };

  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-white">
      {events.map((event) => (
        <li key={event.slug} className="px-4 py-3">
          <p className="font-semibold text-azure-900">{pattern(event)}</p>
          <p>
            {format.dateTimeRange(event.startsAt, event.endsAt, { hour: "numeric", minute: "2-digit" })} ·{" "}
            <NavLink href={`/events/${event.slug}`}>{event.title}</NavLink>
          </p>
          <p className={`text-sm ${pub.muted}`}>{event.venue}</p>
        </li>
      ))}
    </ul>
  );
}
