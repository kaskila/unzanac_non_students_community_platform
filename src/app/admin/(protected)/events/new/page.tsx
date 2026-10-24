import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ui } from "@/components/admin/ui";
import { listCommitteesForAdmin } from "@/server/services/committees";
import { readSiteContent } from "@/server/services/site-content";
import { requirePermission } from "@/server/session";
import { EventForm } from "../event-form";

export default async function NewEventPage() {
  await requirePermission("content.manage");
  const [t, committees, site] = await Promise.all([
    getTranslations("Admin.events"),
    listCommitteesForAdmin(),
    readSiteContent(),
  ]);
  return (
    <div className="space-y-6">
      <p>
        <Link href="/admin/events">{t("back")}</Link>
      </p>
      <h1 className={ui.h1}>{t("newTitle")}</h1>
      <EventForm event={null} committees={committees} defaultVenue={site.location.name} />
    </div>
  );
}
