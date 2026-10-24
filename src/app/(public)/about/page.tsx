import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader, Prose, pub } from "@/components/public/ui";
import { getSiteContent } from "@/server/public";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("About");
  return { title: t("title") };
}

/** About the congregation. The text is edited under Admin → Site content. */
export default async function AboutPage() {
  const [t, site] = await Promise.all([getTranslations("About"), getSiteContent()]);
  return (
    <div className={pub.container}>
      <PageHeader title={t("title")} />
      <Prose source={site.about.body} />
    </div>
  );
}
