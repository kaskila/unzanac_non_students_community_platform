import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NavLink } from "@/components/public/nav-link";
import { PageHeader, pub } from "@/components/public/ui";
import { formatBytes, kindLabel } from "@/lib/file-rules";
import { excerpt } from "@/lib/markdown";
import {
  getLiveAnnouncements,
  getPublicCommittees,
  getPublicMaterials,
  getPublishedVideos,
  getUpcomingEvents,
} from "@/server/public";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Search");
  return { title: t("title"), robots: { index: false } };
}

type Props = PageProps<"/search">;

export default async function SearchPage({ searchParams }: Props) {
  const t = await getTranslations("Search");
  return (
    <div className={pub.container}>
      <PageHeader title={t("title")} />
      <Suspense fallback={<p>{t("loading")}</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type Hit = { href: string; title: string; detail?: string };

/** Every word must appear somewhere in the text (case-insensitive). */
function matches(words: string[], ...texts: (string | null | undefined)[]) {
  const haystack = texts.filter(Boolean).join(" ").toLowerCase();
  return words.every((w) => haystack.includes(w));
}

async function Results({ searchParams }: Pick<Props, "searchParams">) {
  const params = await searchParams;
  const query = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);
  const t = await getTranslations("Search");
  if (!query) return <p className={pub.muted}>{t("empty")}</p>;

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  // All public content is small and already cached, so searching it in memory is cheap.
  const [announcements, events, committees, videos, materials] = await Promise.all([
    getLiveAnnouncements(200),
    getUpcomingEvents(120),
    getPublicCommittees(),
    getPublishedVideos(),
    getPublicMaterials(),
  ]);

  const seenEvents = new Set<string>();
  const groups: { key: string; hits: Hit[] }[] = [
    {
      key: "announcements",
      hits: announcements
        .filter((a) => matches(words, a.title, a.body))
        .map((a) => ({ href: `/announcements/${a.slug}`, title: a.title, detail: excerpt(a.body, 140) })),
    },
    {
      key: "activities",
      hits: events
        .filter(({ event }) => !seenEvents.has(event.slug) && seenEvents.add(event.slug))
        .filter(({ event }) => matches(words, event.title, event.details, event.venue, event.audience))
        .map(({ event }) => ({ href: `/events/${event.slug}`, title: event.title, detail: event.venue })),
    },
    {
      key: "committees",
      hits: committees
        .filter((c) => matches(words, c.name, c.description, c.meetingInfo))
        .map((c) => ({ href: `/committees/${c.slug}`, title: c.name, detail: c.meetingInfo ?? undefined })),
    },
    {
      key: "videos",
      hits: videos.filter((v) => matches(words, v.title, v.description)).map((v) => ({ href: `/watch/${v.slug}`, title: v.title })),
    },
    {
      key: "resources",
      hits: materials
        .filter((m) => matches(words, m.title, m.description))
        .map((m) => ({
          href: `/resources/${m.slug}`,
          title: m.title,
          detail: m.currentFile ? `${kindLabel(m.currentFile.mimeType)} · ${formatBytes(m.currentFile.sizeBytes)}` : undefined,
        })),
    },
  ].filter((g) => g.hits.length > 0);

  const total = groups.reduce((n, g) => n + g.hits.length, 0);
  return (
    <div className="space-y-8">
      <p role="status">{t("count", { count: total, query })}</p>
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`results-${group.key}`}>
          <h2 id={`results-${group.key}`} className={`${pub.h3} mb-2`}>
            {t(`groups.${group.key}`)}
          </h2>
          <ul className="space-y-3">
            {group.hits.map((hit) => (
              <li key={hit.href} className={pub.card}>
                <NavLink href={hit.href} className="font-semibold">
                  {hit.title}
                </NavLink>
                {hit.detail && <p className="text-sm text-muted">{hit.detail}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
