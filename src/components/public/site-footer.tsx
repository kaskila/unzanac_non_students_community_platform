import { getTranslations } from "next-intl/server";
import { SOCIAL_LINKS } from "@/lib/site";

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  return (
    <footer className="mt-12 border-t border-line bg-azure-50">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <p className="font-semibold text-azure-900">{t("follow")}</p>
        <ul className="mt-2 flex flex-wrap gap-4">
          <li>
            <a href={SOCIAL_LINKS.youtube} rel="noopener" className="inline-flex min-h-11 items-center">
              {t("youtube")}
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
