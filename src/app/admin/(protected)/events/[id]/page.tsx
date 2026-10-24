import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/admin/fields";
import { ui } from "@/components/admin/ui";
import { listCommitteesForAdmin } from "@/server/services/committees";
import { getEventForAdmin } from "@/server/services/events";
import { requirePermission } from "@/server/session";
import { EventDates } from "../event-dates";
import { EventForm } from "../event-form";

export default async function EditEventPage({ params }: PageProps<"/admin/events/[id]">) {
  await requirePermission("content.manage");
  const { id } = await params;
  const [t, event, committees] = await Promise.all([getTranslations("Admin.events"), getEventForAdmin(id), listCommitteesForAdmin()]);
  if (!event) notFound();

  return (
    <div className="space-y-8">
      <p>
        <Link href="/admin/events">{t("back")}</Link>
      </p>
      <div className="space-y-2">
        <h1 className={ui.h1}>{event.title}</h1>
        <p className="flex flex-wrap items-center gap-3">
          <StatusBadge tone={event.status === "PUBLISHED" ? "live" : event.status === "DRAFT" ? "draft" : "muted"}>
            {t(`status.${event.status}`)}
          </StatusBadge>
          {event.status === "PUBLISHED" && <a href={`/events/${event.slug}`}>{t("viewPublic")}</a>}
        </p>
      </div>
      <EventForm event={event} committees={committees} defaultVenue="" />
      {event.rrule && <EventDates event={event} />}
    </div>
  );
}
