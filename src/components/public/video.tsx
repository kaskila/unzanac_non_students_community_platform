import { getFormatter, getTranslations } from "next-intl/server";
import { NavLink } from "@/components/public/nav-link";
import { TapToPlay } from "@/components/public/tap-to-play";
import { pub } from "@/components/public/ui";
import { youTubeAppUrl, youTubeEmbedUrl } from "@/lib/video-links";

export type PublicVideo = {
  slug: string;
  source: "YOUTUBE" | "FACEBOOK";
  kind: "VIDEO" | "LIVE" | "PLAYLIST";
  externalId: string;
  title: string;
  thumbnailUrl: string | null;
  recordedAt: Date | null;
};

/** The player (YouTube, tap to play) or a link card (Facebook), plus the "open in app" link. */
export async function VideoPlayer({ video }: { video: PublicVideo }) {
  const t = await getTranslations("Watch");
  if (video.source === "FACEBOOK") {
    return (
      <div className={`${pub.card} space-y-2 bg-azure-50`}>
        <p>{t("facebookNote")}</p>
        <a href={video.externalId} rel="noopener" className={pub.primary}>
          {t("watchOnFacebook")}
        </a>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <TapToPlay
        embedUrl={youTubeEmbedUrl(video.kind, video.externalId)}
        thumbnailUrl={video.thumbnailUrl}
        title={video.title}
        playLabel={t("play")}
      />
      <a href={youTubeAppUrl(video.kind, video.externalId)} rel="noopener" className="inline-flex min-h-11 items-center">
        {t("openInApp")}
      </a>
    </div>
  );
}

/** A list item: lazy thumbnail (or none in titles-only mode) linking to the video's page. */
export async function VideoCard({ video, showThumbnail }: { video: PublicVideo; showThumbnail: boolean }) {
  const format = await getFormatter();
  return (
    <li className="flex gap-3">
      {showThumbnail && video.thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={video.thumbnailUrl}
          alt=""
          width={128}
          height={72}
          loading="lazy"
          decoding="async"
          className="h-[72px] w-32 shrink-0 rounded object-cover"
        />
      )}
      <div className="min-w-0">
        <NavLink href={`/watch/${video.slug}`} className="font-semibold">
          {video.title}
        </NavLink>
        <p className="text-sm text-muted">
          {video.source === "FACEBOOK" ? "Facebook" : "YouTube"}
          {video.recordedAt && ` · ${format.dateTime(video.recordedAt, { dateStyle: "medium" })}`}
        </p>
      </div>
    </li>
  );
}
