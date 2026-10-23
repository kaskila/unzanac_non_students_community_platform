import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NavLink } from "@/components/public/nav-link";
import { ContactList, PageHeader, pub } from "@/components/public/ui";
import { getSiteContent } from "@/server/public";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Contact");
  return { title: t("title") };
}

export default async function ContactPage() {
  const [t, tf, site] = await Promise.all([getTranslations("Contact"), getTranslations("Footer"), getSiteContent()]);
  const { location, social } = site;
  const channels = [
    { href: social.whatsappChannel, label: tf("whatsappChannel") },
    { href: social.facebook, label: tf("facebook") },
    { href: social.youtube, label: tf("youtube") },
  ].filter((c) => c.href);

  return (
    <div className={`${pub.container} space-y-8`}>
      <PageHeader title={t("title")} intro={t("intro")} />

      {site.contacts.items.length > 0 ? (
        <ContactList contacts={site.contacts.items} />
      ) : (
        <p className={pub.muted}>{t("noContacts")}</p>
      )}

      <section aria-labelledby="where-title" className="space-y-2">
        <h2 id="where-title" className={pub.h2}>
          {t("whereTitle")}
        </h2>
        <p className="font-semibold">{location.name}</p>
        {location.address && <p>{location.address}</p>}
        <p className="flex flex-wrap gap-x-5">
          {location.mapUrl && (
            <a href={location.mapUrl} rel="noopener" className="inline-flex min-h-11 items-center">
              {t("directions")}
            </a>
          )}
          <NavLink href="/visit" className="inline-flex min-h-11 items-center">
            {t("planVisit")}
          </NavLink>
        </p>
      </section>

      {channels.length > 0 && (
        <section aria-labelledby="follow-title" className="space-y-2">
          <h2 id="follow-title" className={pub.h2}>
            {t("followTitle")}
          </h2>
          <ul className="flex flex-wrap gap-x-5">
            {channels.map((c) => (
              <li key={c.href}>
                <a href={c.href} rel="noopener" className="inline-flex min-h-11 items-center">
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
