import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { NavLink } from "@/components/public/nav-link";
import { PageHeader, pub, ShareOnWhatsApp } from "@/components/public/ui";
import { excerpt } from "@/lib/markdown";
import { shareText } from "@/lib/share-text";
import { siteUrl } from "@/lib/site";
import { getLiveAnnouncements } from "@/server/public";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Announcements");
  return { title: t("title") };
}

export default async function AnnouncementsPage() {
  const [t, tc, format, announcements] = await Promise.all([
    getTranslations("Announcements"),
    getTranslations("Content"),
    getFormatter(),
    getLiveAnnouncements(),
  ]);
  return (
    <div className={pub.container}>
      <PageHeader title={t("title")} intro={t("intro")} />
      {announcements.length === 0 ? (
        <p className={pub.muted}>{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {announcements.map((a) => (
            <li key={a.slug} className={pub.card}>
              <h2 className={pub.h3}>
                <NavLink href={`/announcements/${a.slug}`}>{a.title}</NavLink>
              </h2>
              <p className="text-sm text-muted">
                {a.pinned && `${tc("pinned")} · `}
                {tc(`categories.${a.category}`)}
                {a.publishAt && ` · ${format.dateTime(a.publishAt, { dateStyle: "medium" })}`}
              </p>
              <p className="mt-1">{excerpt(a.body, 200)}</p>
              <ShareOnWhatsApp
                title={a.title}
                text={shareText({ title: a.title, body: a.body, url: siteUrl(`/announcements/${a.slug}`) })}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
