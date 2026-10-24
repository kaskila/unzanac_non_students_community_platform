import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NavLink } from "@/components/public/nav-link";
import { ScheduleList } from "@/components/public/schedule";
import { PageHeader, pub } from "@/components/public/ui";
import { mapDirectionsUrl, mapEmbedUrl, mapOpenUrl, parseCoordinates } from "@/lib/map";
import { getRegularSchedule, getSiteContent } from "@/server/public";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ChurchFinder");
  return { title: t("title") };
}

/**
 * Church finder: a zoomable Google map of the church, plus links that open directions in the
 * Maps app. The map (Google's embed, ~1 MB) is only on this page, which visitors open on purpose.
 */
export default async function ChurchFinderPage() {
  const [t, site, schedule] = await Promise.all([getTranslations("ChurchFinder"), getSiteContent(), getRegularSchedule()]);
  const { location } = site;
  const spot = parseCoordinates(location.latitude, location.longitude);

  return (
    <div className={`${pub.container} space-y-8`}>
      <PageHeader title={t("title")} intro={t("intro")} />

      <section aria-labelledby="where-title" className="space-y-4">
        <h2 id="where-title" className={pub.h2}>
          {location.name}
        </h2>
        {location.address && <p>{location.address}</p>}
        {spot ? (
          <>
            <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-line bg-azure-50 sm:aspect-video">
              <iframe
                src={mapEmbedUrl(spot)}
                title={t("mapTitle", { name: location.name })}
                className="h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <p className="flex flex-wrap gap-3">
              <a href={mapDirectionsUrl(spot)} rel="noopener" className={pub.primary}>
                {t("directions")}
              </a>
              <a href={location.mapUrl || mapOpenUrl(spot)} rel="noopener" className={pub.secondary}>
                {t("openMaps")}
              </a>
            </p>
            <p className={`text-sm ${pub.muted}`}>{t("dataNote")}</p>
          </>
        ) : (
          location.mapUrl && (
            <a href={location.mapUrl} rel="noopener" className={pub.primary}>
              {t("openMaps")}
            </a>
          )
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

      <p>
        <NavLink href="/visit">{t("planVisit")}</NavLink>
      </p>
    </div>
  );
}
