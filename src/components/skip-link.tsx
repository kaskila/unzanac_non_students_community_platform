import { getTranslations } from "next-intl/server";

export async function SkipLink() {
  const t = await getTranslations("Site");
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:bg-white focus:p-3"
    >
      {t("skipToContent")}
    </a>
  );
}
