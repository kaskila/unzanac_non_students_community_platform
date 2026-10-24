import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { NavLink } from "@/components/public/nav-link";
import { getSiteContent } from "@/server/public";

// Footer from the congregation's design: an Azure band with the emblem, the church's name and the
// social links. White on Azure is 3.27:1, so every text here is WCAG "large": 24px+, or 18.7px+ bold.

// Simplified brand marks (24×24) in their own colours; each sits on its brand-coloured circle.
const ICONS: Record<"youtube" | "tiktok" | "facebook" | "whatsapp", { bg: string; mark: ReactNode }> = {
  youtube: {
    bg: "#ff0000",
    mark: <path d="M10 8.5v7l6-3.5z" fill="#ffffff" />,
  },
  tiktok: {
    bg: "#000000",
    mark: (
      <path
        d="M13.6 5h2.2c.3 1.6 1.4 2.7 3 2.9v2.2a5.3 5.3 0 0 1-3-.9v4.9a4.4 4.4 0 1 1-4.4-4.4h.4v2.3a2.1 2.1 0 1 0 1.8 2.1z"
        fill="#ffffff"
      />
    ),
  },
  facebook: {
    bg: "#1877f2",
    mark: (
      <path
        d="M13.4 20v-6.2h2.1l.3-2.5h-2.4V9.8c0-.7.2-1.2 1.2-1.2h1.3V6.4c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.3v1.8H8.7v2.5h2.1V20z"
        fill="#ffffff"
      />
    ),
  },
  whatsapp: {
    bg: "#25d366",
    mark: (
      <>
        <path d="M12 5.2a6.8 6.8 0 0 0-5.9 10.2L5.2 19l3.7-1A6.8 6.8 0 1 0 12 5.2Z" fill="none" stroke="#ffffff" strokeWidth="1.5" />
        <path
          d="M9.6 8.9c.2-.4.4-.4.6-.4h.4c.1 0 .3 0 .4.3l.6 1.4c0 .1.1.3 0 .4l-.3.5-.3.3c-.1.1-.2.2-.1.4.4.7 1.3 1.6 2.1 2 .2.1.3.1.4 0l.6-.7c.1-.2.3-.2.4-.1l1.3.7c.2.1.3.1.3.2 0 .2 0 .8-.3 1.1-.3.4-1 .7-1.5.7-.5 0-1.2-.1-2.6-.9a8 8 0 0 1-2.4-2.7c-.4-.7-.6-1.4-.4-2 .1-.5.5-.9.7-1z"
          fill="#ffffff"
        />
      </>
    ),
  },
};

function SocialIcon({ name }: { name: keyof typeof ICONS }) {
  const icon = ICONS[name];
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-11">
      {name === "youtube" ? <rect x="1" y="4" width="22" height="16" rx="5" fill={icon.bg} /> : <circle cx="12" cy="12" r="11" fill={icon.bg} />}
      {icon.mark}
    </svg>
  );
}

export async function SiteFooter() {
  const [t, site] = await Promise.all([getTranslations("Footer"), getSiteContent()]);
  const social = (
    [
      { name: "youtube", href: site.social.youtube, label: t("youtube") },
      { name: "tiktok", href: site.social.tiktok, label: t("tiktok") },
      { name: "facebook", href: site.social.facebook, label: t("facebook") },
      { name: "whatsapp", href: site.social.whatsappChannel, label: t("whatsappChannel") },
    ] as const
  ).filter((link) => link.href);

  return (
    <footer className="mx-auto w-full max-w-6xl bg-azure-500 text-white sm:mb-6">
      <div className="grid items-center gap-6 px-6 py-8 text-center md:grid-cols-[auto_1fr_auto] md:text-left">
        <div className="mx-auto w-fit rounded-2xl border-2 border-white p-2 md:mx-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblem-80.webp" width={64} height={64} alt={t("emblemAlt")} className="size-16 rounded-lg" />
        </div>

        <p className="mx-auto w-fit text-center">
          <span className="block border-b-2 border-white px-2 pb-1 text-[26px] font-bold uppercase leading-tight">{t("church")}</span>
          <span className="mt-1 block text-2xl uppercase">{t("congregation")}</span>
        </p>

        <div className="space-y-3">
          {social.length > 0 && (
            <ul className="mx-auto flex w-fit gap-2 rounded-full border-2 border-white px-3 py-1.5 md:ml-auto md:mr-0">
              {social.map((link) => (
                <li key={link.name}>
                  <a href={link.href} rel="noopener" aria-label={link.label} className="flex size-11 items-center justify-center rounded-full">
                    <SocialIcon name={link.name} />
                  </a>
                </li>
              ))}
            </ul>
          )}
          <ul className="flex flex-wrap justify-center gap-x-6 md:justify-end">
            <li>
              <NavLink href="/privacy" className="inline-flex min-h-11 items-center text-[18.7px] font-bold uppercase text-white no-underline hover:underline">
                {t("privacy")}
              </NavLink>
            </li>
            <li>
              <NavLink href="/terms" className="inline-flex min-h-11 items-center text-[18.7px] font-bold uppercase text-white no-underline hover:underline">
                {t("terms")}
              </NavLink>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
