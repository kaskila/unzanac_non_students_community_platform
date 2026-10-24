import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ContactList, OccurrenceBadges, PageHeader, Prose, pub, When } from "@/components/public/ui";
import { NavLink } from "@/components/public/nav-link";
import { excerpt } from "@/lib/markdown";
import { getPublicCommittee, getUpcomingEvents } from "@/server/public";

type Props = PageProps<"/committees/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const committee = await getPublicCommittee((await params).slug);
  if (!committee) return {};
  return { title: committee.name, description: committee.description ? excerpt(committee.description, 160) : undefined };
}

export default async function CommitteePage({ params }: Props) {
  const t = await getTranslations("Content");
  return (
    <div className={pub.container}>
      <Suspense fallback={<p className="pt-8">{t("loading")}</p>}>
        <Committee params={params} />
      </Suspense>
    </div>
  );
}

async function Committee({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const [t, committee, upcoming] = await Promise.all([
    getTranslations("Committees"),
    getPublicCommittee(slug),
    getUpcomingEvents(90),
  ]);
  if (!committee) notFound();
  const events = upcoming.filter((e) => e.event.committee?.slug === committee.slug).slice(0, 5);

  return (
    <article className="space-y-6">
      <PageHeader title={committee.name} back={{ href: "/committees", label: t("back") }} />
      {committee.description ? <Prose source={committee.description} /> : <p className={pub.muted}>{t("noDescription")}</p>}
      {committee.meetingInfo && (
        <section aria-labelledby="meets-title">
          <h2 id="meets-title" className={pub.h3}>
            {t("meets")}
          </h2>
          <p>{committee.meetingInfo}</p>
        </section>
      )}
      {committee.contactName && committee.contactPhone && (
        <section aria-labelledby="contact-title" className="space-y-2">
          <h2 id="contact-title" className={pub.h3}>
            {t("contact")}
          </h2>
          <ContactList contacts={[{ role: t("contactRole"), name: committee.contactName, phone: committee.contactPhone, whatsapp: true }]} />
        </section>
      )}
      <p className={pub.muted}>{t("joinHint")}</p>
      {events.length > 0 && (
        <section aria-labelledby="events-title" className="space-y-2">
          <h2 id="events-title" className={pub.h3}>
            {t("upcoming")}
          </h2>
          <ul className="space-y-2">
            {events.map(({ event, occurrence }) => (
              <li key={`${event.slug}-${occurrence.originalStart.toISOString()}`} className={pub.card}>
                <p className="font-semibold">
                  <When start={occurrence.start} end={occurrence.end} />
                </p>
                <NavLink href={`/events/${event.slug}`}>{event.title}</NavLink>
                <OccurrenceBadges cancelled={occurrence.cancelled} moved={occurrence.moved} note={occurrence.note} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
