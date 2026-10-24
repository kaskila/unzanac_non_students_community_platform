import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { NavLink } from "@/components/public/nav-link";
import { CurrentSiteNav } from "@/components/public/current-site-nav";
import { SiteNav } from "@/components/public/site-nav";

function PinIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0 fill-none stroke-current stroke-[1.5]">
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0 fill-none stroke-current stroke-[1.5]">
      <path d="M5 3.5h3l1.5 4.5-2 1.5a12 12 0 0 0 7 7l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A17 17 0 0 1 3 5.5a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

/** The mockup's top: a white card (emblem, name, Church finder, Contact) and the Azure menu bar. */
export async function SiteHeader() {
  const t = await getTranslations("Site");
  const labels = {
    label: t("nav.label"),
    menu: t("nav.menu"),
    search: t("nav.search"),
    searchPlaceholder: t("nav.searchPlaceholder"),
  };
  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/committees", label: t("nav.committees") },
    { href: "/announcements", label: t("nav.announcements") },
    { href: "/events", label: t("nav.activities") },
    { href: "/watch", label: t("nav.media") },
    { href: "/about", label: t("nav.about") },
  ];

  return (
    <header className="mx-auto w-full max-w-6xl sm:px-0 sm:pt-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-white px-4 py-3 sm:mb-4 sm:px-6 sm:py-4">
        <NavLink href="/" className="flex min-h-11 items-center gap-3 no-underline">
          {/* Plain <img>: next/image would add client JavaScript for a 2 KB file. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblem-80.webp" width={56} height={56} alt={t("emblemAlt")} className="size-12 rounded sm:size-14" />
          <span className="flex flex-col leading-tight">
            <span className="text-2xl font-bold text-azure-900">{t("name")}</span>
            <span className="text-sm text-muted sm:text-base">{t("tagline")}</span>
          </span>
        </NavLink>
        <ul className="flex flex-wrap gap-x-6">
          <li>
            <NavLink href="/church-finder" className="inline-flex min-h-11 items-center gap-2 uppercase text-azure-700 no-underline hover:underline">
              <PinIcon />
              {t("nav.churchFinder")}
            </NavLink>
          </li>
          <li>
            <NavLink href="/contact" className="inline-flex min-h-11 items-center gap-2 uppercase text-azure-700 no-underline hover:underline">
              <PhoneIcon />
              {t("nav.contact")}
            </NavLink>
          </li>
        </ul>
      </div>
      {/* The current page is only known per request; the shell shows the menu without the mark. */}
      <Suspense fallback={<SiteNav links={links} labels={labels} />}>
        <CurrentSiteNav links={links} labels={labels} />
      </Suspense>
    </header>
  );
}
