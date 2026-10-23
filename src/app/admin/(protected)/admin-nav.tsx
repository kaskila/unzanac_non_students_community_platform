import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { can } from "@/server/policy";
import { requireActor } from "@/server/session";
import { signOutAction } from "./actions";

export async function AdminNav() {
  const actor = await requireActor();
  const t = await getTranslations("Admin");

  const links = [
    { href: "/admin", label: t("nav.dashboard"), show: true },
    { href: "/admin/announcements", label: t("nav.announcements"), show: can(actor, "content.manage") },
    { href: "/admin/events", label: t("nav.events"), show: can(actor, "content.manage") },
    { href: "/admin/media", label: t("nav.media"), show: can(actor, "media.manage") },
    { href: "/admin/resources", label: t("nav.resources"), show: can(actor, "media.manage") },
    { href: "/admin/committees", label: t("nav.committees"), show: can(actor, "content.manage") },
    { href: "/admin/content", label: t("nav.content"), show: can(actor, "site.edit") },
    { href: "/admin/home-photos", label: t("nav.homePhotos"), show: can(actor, "site.edit") },
    { href: "/admin/register", label: t("nav.register"), show: can(actor, "register.view") },
    { href: "/admin/users", label: t("nav.users"), show: can(actor, "admin.manage") },
    { href: "/admin/audit", label: t("nav.audit"), show: can(actor, "audit.view") },
    { href: "/", label: t("nav.viewSite"), show: true },
  ].filter((l) => l.show);

  return (
    <nav aria-label={t("nav.label")} className="flex basis-full flex-wrap items-center gap-x-4 md:basis-auto md:flex-1">
      <ul className="flex flex-wrap gap-x-4">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="inline-flex min-h-11 items-center">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <form action={signOutAction} className="flex items-center gap-3 md:ml-auto">
        <span className="text-sm text-muted">
          {actor.name} · {t(`roles.${actor.role}`)}
        </span>
        <button type="submit" className="min-h-11 text-azure-700 underline">
          {t("nav.signOut")}
        </button>
      </form>
    </nav>
  );
}
