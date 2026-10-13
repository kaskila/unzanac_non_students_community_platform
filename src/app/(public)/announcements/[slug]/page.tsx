import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { PageHeader, Prose, pub, ShareOnWhatsApp } from "@/components/public/ui";
import { excerpt } from "@/lib/markdown";
import { shareText } from "@/lib/share-text";
import { siteUrl } from "@/lib/site";
import { getLiveAnnouncement } from "@/server/public";

type Props = PageProps<"/announcements/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const announcement = await getLiveAnnouncement((await params).slug);
  if (!announcement) return {};
  return { title: announcement.title, description: excerpt(announcement.body, 160) };
}

export default async function AnnouncementPage({ params }: Props) {
  const t = await getTranslations("Content");
  return (
    <div className={pub.container}>
      <Suspense fallback={<p className="pt-8">{t("loading")}</p>}>
        <Announcement params={params} />
      </Suspense>
    </div>
  );
}

async function Announcement({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const [t, tc, format, announcement] = await Promise.all([
    getTranslations("Announcements"),
    getTranslations("Content"),
    getFormatter(),
    getLiveAnnouncement(slug),
  ]);
  if (!announcement) notFound();

  const url = siteUrl(`/announcements/${announcement.slug}`);
  return (
    <article>
      <PageHeader
        title={announcement.title}
        back={{ href: "/announcements", label: t("back") }}
        intro={[
          tc(`categories.${announcement.category}`),
          announcement.committee?.isPublic ? announcement.committee.name : null,
          announcement.publishAt ? format.dateTime(announcement.publishAt, { dateStyle: "long" }) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      <Prose source={announcement.body} />
      <p className="mt-6">
        <ShareOnWhatsApp title={announcement.title} text={shareText({ title: announcement.title, body: announcement.body, url })} />
      </p>
    </article>
  );
}
