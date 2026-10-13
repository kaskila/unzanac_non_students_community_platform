import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ScheduleList } from "@/components/public/schedule";
import { ContactList, PageHeader, Prose, pub } from "@/components/public/ui";
import { getRegularSchedule, getSiteContent } from "@/server/public";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Visit");
  return { title: t("title") };
}

export default async function VisitPage() {
  const [t, site, schedule] = await Promise.all([getTranslations("Visit"), getSiteContent(), getRegularSchedule()]);
  const { location } = site;
  return (
    <div className={`${pub.container} space-y-8`}>
      <PageHeader title={t("title")} />
      <Prose source={site.visit.body} />

      <section aria-labelledby="where-title" className="space-y-2">
        <h2 id="where-title" className={pub.h2}>
          {t("whereTitle")}
        </h2>
        <p className="font-semibold">{location.name}</p>
        {location.address && <p>{location.address}</p>}
        {location.mapUrl && (
          <a href={location.mapUrl} rel="noopener" className={pub.secondary}>
            {t("directions")}
          </a>
        )}
      </section>

      {schedule.length > 0 && (
        <section aria-labelledby="times-title" className="space-y-4">
          <h2 id="times-title" className={pub.h2}>
            {t("timesTitle")}
          </h2>
          <ScheduleList events={schedule} />
        </section>
      )}

      {site.contacts.items.length > 0 && (
        <section aria-labelledby="questions-title" className="space-y-4">
          <h2 id="questions-title" className={pub.h2}>
            {t("questionsTitle")}
          </h2>
          <ContactList contacts={site.contacts.items} />
        </section>
      )}
    </div>
  );
}
