import { getTranslations } from "next-intl/server";
import { NavLink } from "@/components/public/nav-link";
import { getSiteContent } from "@/server/public";

export async function SiteFooter() {
  const [t, site] = await Promise.all([getTranslations("Footer"), getSiteContent()]);
  const social = [
    { href: site.social.youtube, label: t("youtube") },
    { href: site.social.facebook, label: t("facebook") },
    { href: site.social.whatsappChannel, label: t("whatsappChannel") },
  ].filter((link) => link.href);

  return (
    <footer className="mt-12 border-t border-line bg-azure-50">
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {social.length > 0 && (
          <div>
            <p className="font-semibold text-azure-900">{t("follow")}</p>
            <ul className="mt-1 flex flex-wrap gap-x-5">
              {social.map((link) => (
                <li key={link.href}>
                  <a href={link.href} rel="noopener" className="inline-flex min-h-11 items-center">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p>
          <NavLink href="/privacy" className="inline-flex min-h-11 items-center">
            {t("privacy")}
          </NavLink>
        </p>
      </div>
    </footer>
  );
}
