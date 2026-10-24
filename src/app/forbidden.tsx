import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ui } from "@/components/admin/ui";

export default async function Forbidden() {
  const t = await getTranslations("Admin.forbidden");
  return (
    <section className="mx-auto max-w-xl space-y-3 px-4 py-10">
      <h1 className={ui.h1}>{t("title")}</h1>
      <p>{t("body")}</p>
      <Link href="/admin" className={ui.secondary}>
        {t("back")}
      </Link>
    </section>
  );
}
