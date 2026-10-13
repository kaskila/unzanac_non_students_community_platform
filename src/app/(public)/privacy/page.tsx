import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { PageHeader, Prose, pub } from "@/components/public/ui";
import { getPrivacyNotice } from "@/server/public";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Privacy");
  return { title: t("title") };
}

export default async function PrivacyPage() {
  const [t, format, notice] = await Promise.all([getTranslations("Privacy"), getFormatter(), getPrivacyNotice()]);
  return (
    <div className={pub.container}>
      <PageHeader
        title={t("title")}
        intro={
          notice
            ? t("version", { version: notice.version, date: format.dateTime(notice.publishedAt, { dateStyle: "long" }) })
            : undefined
        }
      />
      {notice ? <Prose source={notice.body} /> : <p>{t("none")}</p>}
    </div>
  );
}
