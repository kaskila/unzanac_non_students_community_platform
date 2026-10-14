import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NavLink } from "@/components/public/nav-link";
import { PageHeader, pub } from "@/components/public/ui";
import { VideoCard } from "@/components/public/video";
import { getPublishedVideos, getSiteContent } from "@/server/public";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Watch");
  return { title: t("title") };
}

type Props = PageProps<"/watch">;

export default async function WatchPage({ searchParams }: Props) {
  const [t, site] = await Promise.all([getTranslations("Watch"), getSiteContent()]);
  return (
    <div className={pub.container}>
      <PageHeader title={t("title")} intro={t("intro")} />
      <Suspense fallback={<p>{t("loading")}</p>}>
        <VideoList searchParams={searchParams} />
      </Suspense>
      {(site.social.youtube || site.social.facebook) && (
        <p className="mt-8 flex flex-wrap gap-x-5">
          {site.social.youtube && (
            <a href={site.social.youtube} rel="noopener" className="inline-flex min-h-11 items-center">
              {t("channel")}
            </a>
          )}
          {site.social.facebook && (
            <a href={site.social.facebook} rel="noopener" className="inline-flex min-h-11 items-center">
              {t("facebookPage")}
            </a>
          )}
        </p>
      )}
    </div>
  );
}

async function VideoList({ searchParams }: Pick<Props, "searchParams">) {
  const titlesOnly = (await searchParams).view === "titles";
  const [t, tc, videos] = await Promise.all([getTranslations("Watch"), getTranslations("Content"), getPublishedVideos()]);
  if (videos.length === 0) return <p className={pub.muted}>{t("empty")}</p>;

  const byCategory = new Map<string, typeof videos>();
  for (const video of videos) byCategory.set(video.category, [...(byCategory.get(video.category) ?? []), video]);

  return (
    <>
      <p className="mb-6">
        {/* Titles-only mode skips the thumbnails, for visitors saving mobile data. */}
        <NavLink href={titlesOnly ? "/watch" : "/watch?view=titles"} className="inline-flex min-h-11 items-center">
          {titlesOnly ? t("showThumbnails") : t("titlesOnly")}
        </NavLink>
      </p>
      <div className="space-y-8">
        {[...byCategory].map(([category, list]) => (
          <section key={category} aria-labelledby={`cat-${category}`}>
            <h2 id={`cat-${category}`} className={`${pub.h2} mb-3`}>
              {tc(`videoCategories.${category}`)}
            </h2>
            <ul className="space-y-3">
              {list.map((video) => (
                <VideoCard key={video.slug} video={video} showThumbnail={!titlesOnly} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
