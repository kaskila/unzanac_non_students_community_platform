import { getTranslations } from "next-intl/server";
import { NavLink } from "@/components/public/nav-link";

export async function SiteHeader() {
  const t = await getTranslations("Site");
  const links = [
    { href: "/announcements", label: t("nav.announcements") },
    { href: "/events", label: t("nav.events") },
    { href: "/committees", label: t("nav.committees") },
    { href: "/visit", label: t("nav.visit") },
  ];
  return (
    <header className="border-b-4 border-azure-500 bg-white">
      <div className="mx-auto max-w-3xl px-4 pt-3">
        <NavLink href="/" className="flex min-h-11 items-center gap-3 no-underline">
          {/* Plain <img>: next/image would add client JavaScript for a 2 KB file. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblem-80.webp" width={40} height={40} alt={t("emblemAlt")} className="rounded" />
          <span className="flex flex-col leading-tight">
            <span className="text-xl font-bold text-azure-900">{t("name")}</span>
            <span className="text-sm text-muted">{t("tagline")}</span>
          </span>
        </NavLink>
        <nav aria-label={t("nav.label")}>
          <ul className="flex flex-wrap gap-x-5 py-1">
            {links.map((link) => (
              <li key={link.href}>
                <NavLink href={link.href} className="inline-flex min-h-11 items-center font-semibold">
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
