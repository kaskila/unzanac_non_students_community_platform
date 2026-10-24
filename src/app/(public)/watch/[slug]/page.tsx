import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { NavLink } from "@/components/public/nav-link";
import { PageHeader, pub, ShareOnWhatsApp } from "@/components/public/ui";
import { VideoPlayer } from "@/components/public/video";
import { shareText } from "@/lib/share-text";
import { siteUrl } from "@/lib/site";
import { getPublicVideo } from "@/server/public";

type Props = PageProps<"/watch/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const video = await getPublicVideo((await params).slug);
  return video ? { title: video.title } : {};
}

export default async function VideoPage({ params }: Props) {
  const t = await getTranslations("Content");
  return (
    <div className={pub.container}>
      <Suspense fallback={<p className="pt-8">{t("loading")}</p>}>
        <Video params={params} />
      </Suspense>
    </div>
  );
}

async function Video({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const [t, tc, format, video] = await Promise.all([
    getTranslations("Watch"),
    getTranslations("Content"),
    getFormatter(),
    getPublicVideo(slug),
  ]);
  if (!video) notFound();

  return (
    <article className="space-y-4">
      <PageHeader
        title={video.title}
        back={{ href: "/watch", label: t("back") }}
        intro={[tc(`videoCategories.${video.category}`), video.recordedAt ? format.dateTime(video.recordedAt, { dateStyle: "long" }) : null]
          .filter(Boolean)
          .join(" · ")}
      />
      <VideoPlayer video={video} />
      {video.description && <p className="whitespace-pre-line">{video.description}</p>}
      {video.committee?.isPublic && (
        <p>
          <NavLink href={`/committees/${video.committee.slug}`}>{video.committee.name}</NavLink>
        </p>
      )}
      <ShareOnWhatsApp title={video.title} text={shareText({ title: video.title, url: siteUrl(`/watch/${video.slug}`) })} />
    </article>
  );
}
