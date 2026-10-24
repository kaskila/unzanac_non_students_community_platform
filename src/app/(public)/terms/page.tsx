import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader, Prose, pub } from "@/components/public/ui";
import { getSiteContent } from "@/server/public";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Terms");
  return { title: t("title") };
}

/** Terms of use. The text is edited under Admin → Site content → Terms of use. */
export default async function TermsPage() {
  const [t, site] = await Promise.all([getTranslations("Terms"), getSiteContent()]);
  return (
    <div className={pub.container}>
      <PageHeader title={t("title")} />
      <Prose source={site.terms.body} />
    </div>
  );
}
