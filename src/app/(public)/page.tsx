import { getFormatter, getTranslations } from "next-intl/server";
import { HeroCarousel } from "@/components/public/hero-carousel";
import { NavLink } from "@/components/public/nav-link";
import { ScheduleList } from "@/components/public/schedule";
import { VideoPlayer } from "@/components/public/video";
import { ContactList, OccurrenceBadges, pub, ShareOnWhatsApp, When } from "@/components/public/ui";
import { formatBytes, kindLabel } from "@/lib/file-rules";
import { excerpt } from "@/lib/markdown";
import { shareText } from "@/lib/share-text";
import { siteUrl } from "@/lib/site";
import {
  getLiveAnnouncements,
  getNextService,
  getPublicCommittees,
  getRegularSchedule,
  getSiteContent,
  getHeroSlides,
  getHomeVideo,
  getLiveNow,
  getPublicMaterials,
  getUpcomingEvents,
} from "@/server/public";

const LATEST_ANNOUNCEMENTS = 3;
const THIS_WEEK_EVENTS = 5;
const NEWEST_RESOURCES = 3;

// Home page (docs/PLAN.md §3, "Home page sections"). All data comes from cached reads, so the
// page is prerendered and refreshed when admins publish (src/server/public.ts).
export default async function HomePage() {
  const [t, format, site, nextService, announcements, thisWeek, schedule, committees, video, materials, live, slides] = await Promise.all([
    getTranslations("Home"),
    getFormatter(),
    getSiteContent(),
    getNextService(),
    getLiveAnnouncements(20),
    getUpcomingEvents(7, THIS_WEEK_EVENTS),
    getRegularSchedule(),
    getPublicCommittees(),
    getHomeVideo(),
    getPublicMaterials(),
    getLiveNow(),
    getHeroSlides(),
  ]);
  const shown = [...announcements.filter((a) => a.pinned), ...announcements.filter((a) => !a.pinned).slice(0, LATEST_ANNOUNCEMENTS)];
  const mapUrl = nextService?.event.mapUrl || site.location.mapUrl;

  return (
    <>
      {live.map(({ event }) => (
        <p key={event.slug} role="status" className="bg-danger px-4 py-3 text-center font-semibold text-white">
          <span aria-hidden="true">● </span>
          {t("liveNow", { title: event.title })}{" "}
          <a href={event.livestreamUrl!} rel="noopener" className="text-white">
            {t("watchLive")}
          </a>
        </p>
      ))}
      {slides.length > 0 && (
        <HeroCarousel
          slides={slides}
          labels={{ region: t("photos"), previous: t("previousPhoto"), next: t("nextPhoto"), slide: t("photoOf") }}
        />
      )}
      {/* With photos the welcome sits on white below them; without, on the Azure band. */}
      <section className={slides.length > 0 ? "" : "bg-azure-500"}>
        <div className={`${pub.container} pb-8 pt-10`}>
          {/* White on azure-500 is 3.27:1, so this title must stay >= 24px (text-4xl = 36px). */}
          <h1 className={slides.length > 0 ? pub.h1 : "text-4xl font-medium leading-tight tracking-tight text-white sm:text-5xl"}>
            {site.hero.title}
          </h1>
          <div className={`mt-5 rounded-lg bg-white p-5 ${slides.length > 0 ? "border border-line" : "shadow-sm"}`}>
            <p>{site.hero.body}</p>
            <h2 className="mt-4 text-lg font-bold text-azure-900">{t("nextServiceTitle")}</h2>
            {nextService ? (
              <div className="mt-1 space-y-1" data-testid="next-service">
                <p className="font-semibold">
                  <When start={nextService.occurrence.start} end={nextService.occurrence.end} />
                </p>
                <p>
                  <NavLink href={`/events/${nextService.event.slug}`}>{nextService.event.title}</NavLink> · {nextService.event.venue}
                </p>
                <OccurrenceBadges cancelled={false} moved={nextService.occurrence.moved} note={nextService.occurrence.note} />
                <p className="flex flex-wrap gap-x-5">
                  <a href={`/events/${nextService.event.slug}/ics`} className="inline-flex min-h-11 items-center">
                    {t("addToCalendar")}
                  </a>
                  {mapUrl && (
                    <a href={mapUrl} rel="noopener" className="inline-flex min-h-11 items-center">
                      {t("directions")}
                    </a>
                  )}
                </p>
              </div>
            ) : (
              <p className={pub.muted}>{t("nextServicePending")}</p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="announcements-title" className={`${pub.container} pt-10`}>
        <h2 id="announcements-title" className={pub.h2}>
          {t("announcementsTitle")}
        </h2>
        {shown.length === 0 ? (
          <p className={`mt-2 ${pub.muted}`}>{t("noAnnouncements")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {shown.map((a) => {
              const url = siteUrl(`/announcements/${a.slug}`);
              return (
                <li key={a.slug} className={pub.card}>
                  <h3 className={pub.h3}>
                    <NavLink href={`/announcements/${a.slug}`}>{a.title}</NavLink>
                  </h3>
                  <p className="text-sm text-muted">
                    {a.pinned && `${t("pinned")} · `}
                    {a.publishAt && format.dateTime(a.publishAt, { dateStyle: "medium" })}
                  </p>
                  <p className="mt-1">{excerpt(a.body, 160)}</p>
                  <ShareOnWhatsApp title={a.title} text={shareText({ title: a.title, body: a.body, url })} />
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3">
          <NavLink href="/announcements" className="inline-flex min-h-11 items-center">
            {t("allAnnouncements")}
          </NavLink>
        </p>
      </section>

      <section aria-labelledby="week-title" className={`${pub.container} pt-8`}>
        <h2 id="week-title" className={pub.h2}>
          {t("thisWeekTitle")}
        </h2>
        {thisWeek.length === 0 ? (
          <p className={`mt-2 ${pub.muted}`}>{t("noEventsThisWeek")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {thisWeek.map(({ event, occurrence }) => (
              <li key={`${event.slug}-${occurrence.originalStart.toISOString()}`} className={pub.card}>
                <p className="font-semibold">
                  <When start={occurrence.start} end={occurrence.end} />
                </p>
                <p>
                  <NavLink href={`/events/${event.slug}`}>{event.title}</NavLink> · {event.venue}
                </p>
                <OccurrenceBadges cancelled={occurrence.cancelled} moved={occurrence.moved} note={occurrence.note} />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3">
          <NavLink href="/events" className="inline-flex min-h-11 items-center">
            {t("allEvents")}
          </NavLink>
        </p>
      </section>

      {schedule.length > 0 && (
        <section aria-labelledby="schedule-title" className={`${pub.container} pt-8`}>
          <h2 id="schedule-title" className={`${pub.h2} mb-4`}>
            {t("scheduleTitle")}
          </h2>
          <ScheduleList events={schedule} />
        </section>
      )}

      <section aria-labelledby="committees-title" className={`${pub.container} pt-10`}>
        <h2 id="committees-title" className={pub.h2}>
          {t("committeesTitle")}
        </h2>
        <p className={`mt-1 ${pub.muted}`}>{t("committeesIntro")}</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {committees.map((committee) => (
            <li key={committee.slug} className={pub.card}>
              <NavLink href={`/committees/${committee.slug}`} className="font-semibold">
                {committee.name}
              </NavLink>
              {committee.meetingInfo && <p className="text-sm text-muted">{committee.meetingInfo}</p>}
            </li>
          ))}
        </ul>
      </section>

      {video && (
        <section aria-labelledby="watch-title" className={`${pub.container} space-y-3 pt-10`}>
          <h2 id="watch-title" className={pub.h2}>
            {t("watchTitle")}
          </h2>
          <p className="font-semibold">{video.title}</p>
          <VideoPlayer video={video} />
          <p className="flex flex-wrap gap-x-5">
            <NavLink href="/watch" className="inline-flex min-h-11 items-center">
              {t("moreVideos")}
            </NavLink>
            {site.social.youtube && (
              <a href={site.social.youtube} rel="noopener" className="inline-flex min-h-11 items-center">
                {t("watchLink")}
              </a>
            )}
          </p>
        </section>
      )}

      {!video && site.social.youtube && (
        <section aria-labelledby="watch-title" className={`${pub.container} pt-10`}>
          <h2 id="watch-title" className={pub.h2}>
            {t("watchTitle")}
          </h2>
          <p className="mt-1">{t("watchBody")}</p>
          <a href={site.social.youtube} rel="noopener" className={`mt-4 ${pub.primary}`}>
            {t("watchLink")}
          </a>
        </section>
      )}

      {materials.length > 0 && (
        <section aria-labelledby="resources-title" className={`${pub.container} pt-10`}>
          <h2 id="resources-title" className={pub.h2}>
            {t("resourcesTitle")}
          </h2>
          <ul className="mt-4 space-y-3">
            {materials.slice(0, NEWEST_RESOURCES).map((m) => (
              <li key={m.slug} className={pub.card}>
                <NavLink href={`/resources/${m.slug}`} className="font-semibold">
                  {m.title}
                </NavLink>
                {m.currentFile && (
                  <p className="text-sm text-muted">
                    {kindLabel(m.currentFile.mimeType)} · {formatBytes(m.currentFile.sizeBytes)}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3">
            <NavLink href="/resources" className="inline-flex min-h-11 items-center">
              {t("allResources")}
            </NavLink>
          </p>
        </section>
      )}

      <section aria-labelledby="new-title" className={`${pub.container} pt-10`}>
        <div className="rounded-lg border border-line border-l-4 border-l-azure-500 bg-white p-5">
          <h2 id="new-title" className={pub.h2}>
            {t("newHereTitle")}
          </h2>
          <p className="mt-1">{t("newHereBody")}</p>
          <NavLink href="/visit" className={`mt-4 ${pub.secondary}`}>
            {t("newHereLink")}
          </NavLink>
        </div>
      </section>

      {site.contacts.items.length > 0 && (
        <section aria-labelledby="contacts-title" className={`${pub.container} pt-10`}>
          <h2 id="contacts-title" className={`${pub.h2} mb-4`}>
            {t("contactsTitle")}
          </h2>
          <ContactList contacts={site.contacts.items} />
        </section>
      )}

      {site.verse.text && (
        <section aria-labelledby="verse-title" className={`${pub.container} pt-10`}>
          <h2 id="verse-title" className={pub.h2}>
            {t("verseTitle")}
          </h2>
          <figure className="mt-3 border-l-4 border-azure-500 pl-4">
            <blockquote className="text-lg">{site.verse.text}</blockquote>
            {site.verse.reference && <figcaption className="mt-1 text-muted">{site.verse.reference}</figcaption>}
          </figure>
        </section>
      )}
    </>
  );
}
