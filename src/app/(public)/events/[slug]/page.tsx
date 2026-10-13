import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { NavLink } from "@/components/public/nav-link";
import { OccurrenceBadges, PageHeader, Prose, pub, ShareOnWhatsApp, When } from "@/components/public/ui";
import { excerpt } from "@/lib/markdown";
import { shareText } from "@/lib/share-text";
import { siteUrl } from "@/lib/site";
import { getPublicEvent, getSiteContent } from "@/server/public";

type Props = PageProps<"/events/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPublicEvent((await params).slug);
  if (!data) return {};
  return { title: data.event.title, description: data.event.details ? excerpt(data.event.details, 160) : data.event.venue };
}

export default async function EventPage({ params }: Props) {
  const t = await getTranslations("Content");
  return (
    <div className={pub.container}>
      <Suspense fallback={<p className="pt-8">{t("loading")}</p>}>
        <EventDetail params={params} />
      </Suspense>
    </div>
  );
}

async function EventDetail({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const [t, format, data, site] = await Promise.all([
    getTranslations("Events"),
    getFormatter(),
    getPublicEvent(slug),
    getSiteContent(),
  ]);
  if (!data) notFound();

  const { event, upcoming } = data;
  const next = upcoming.find((o) => !o.cancelled);
  const mapUrl = event.mapUrl || site.location.mapUrl;
  const url = siteUrl(`/events/${event.slug}`);
  const when = next
    ? format.dateTimeRange(next.start, next.end, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <article>
      <PageHeader title={event.title} back={{ href: "/events", label: t("back") }} />
      <dl className="space-y-3">
        <div>
          <dt className="font-semibold text-azure-900">{event.rrule ? t("nextDates") : t("when")}</dt>
          <dd>
            {upcoming.length === 0 ? (
              <span className={pub.muted}>{t("noUpcoming")}</span>
            ) : (
              <ul className="space-y-1">
                {upcoming.slice(0, event.rrule ? 6 : 1).map((o) => (
                  <li key={o.originalStart.toISOString()} className="flex flex-wrap items-center gap-2">
                    <When start={o.start} end={o.end} />
                    <OccurrenceBadges cancelled={o.cancelled} moved={o.moved} note={o.note} />
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-azure-900">{t("venue")}</dt>
          <dd>
            {event.venue}
            {mapUrl && (
              <>
                {" · "}
                <a href={mapUrl} rel="noopener">
                  {t("directions")}
                </a>
              </>
            )}
          </dd>
        </div>
        {event.audience && (
          <div>
            <dt className="font-semibold text-azure-900">{t("audience")}</dt>
            <dd>{event.audience}</dd>
          </div>
        )}
        {event.committee?.isPublic && (
          <div>
            <dt className="font-semibold text-azure-900">{t("committee")}</dt>
            <dd>
              <NavLink href={`/committees/${event.committee.slug}`}>{event.committee.name}</NavLink>
            </dd>
          </div>
        )}
      </dl>
      {event.details && <Prose source={event.details} className="mt-6" />}
      <p className="mt-6 flex flex-wrap gap-3">
        <a href={`/events/${event.slug}/ics`} className={pub.primary}>
          {t("addToCalendar")}
        </a>
      </p>
      <p className="mt-2">
        <ShareOnWhatsApp
          title={event.title}
          text={shareText({ title: event.title, body: event.details, url, extra: [when, event.venue].filter(Boolean).join(" · ") })}
        />
      </p>
    </article>
  );
}
