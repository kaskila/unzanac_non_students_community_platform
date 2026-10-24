import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { can } from "@/server/policy";
import { requireActor } from "@/server/session";
import { signOutAction } from "./actions";
import { AdminTabs, type TabGroup } from "./admin-tabs";

/** Who is signed in (top right) and the tabs their role may use. */
export async function AdminNav() {
  const actor = await requireActor();
  const t = await getTranslations("Admin");

  const group = (label: string | null, links: { href: string; label: string; show: boolean }[]): TabGroup => ({
    label,
    links: links.filter((l) => l.show).map(({ href, label }) => ({ href, label })),
  });
  const groups = [
    group(null, [{ href: "/admin", label: t("nav.dashboard"), show: true }]),
    group(t("nav.groupContent"), [
      { href: "/admin/announcements", label: t("nav.announcements"), show: can(actor, "content.manage") },
      { href: "/admin/events", label: t("nav.events"), show: can(actor, "content.manage") },
      { href: "/admin/media", label: t("nav.media"), show: can(actor, "media.manage") },
      { href: "/admin/resources", label: t("nav.resources"), show: can(actor, "media.manage") },
      { href: "/admin/committees", label: t("nav.committees"), show: can(actor, "content.manage") },
    ]),
    group(t("nav.groupWebsite"), [
      { href: "/admin/content", label: t("nav.content"), show: can(actor, "site.edit") },
      { href: "/admin/home-photos", label: t("nav.homePhotos"), show: can(actor, "site.edit") },
    ]),
    group(t("nav.groupPeople"), [
      { href: "/admin/register", label: t("nav.register"), show: can(actor, "register.view") },
      { href: "/admin/users", label: t("nav.users"), show: can(actor, "admin.manage") },
      { href: "/admin/audit", label: t("nav.audit"), show: can(actor, "audit.view") },
    ]),
  ].filter((g) => g.links.length > 0);

  return (
    <>
      <div className="flex items-center gap-x-4 text-sm">
        <span className="hidden text-muted sm:inline">
          {actor.name} · {t(`roles.${actor.role}`)}
        </span>
        <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-azure-700 no-underline hover:underline">
          {t("nav.viewSite")}
        </Link>
        <form action={signOutAction}>
          <button type="submit" className="inline-flex min-h-11 items-center font-semibold text-azure-700 hover:underline">
            {t("nav.signOut")}
          </button>
        </form>
      </div>
      <div className="min-w-0 basis-full">
        <AdminTabs groups={groups} label={t("nav.label")} />
      </div>
    </>
  );
}
