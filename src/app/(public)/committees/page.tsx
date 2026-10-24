import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NavLink } from "@/components/public/nav-link";
import { PageHeader, pub } from "@/components/public/ui";
import { excerpt } from "@/lib/markdown";
import { getPublicCommittees } from "@/server/public";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Committees");
  return { title: t("title") };
}

export default async function CommitteesPage() {
  const [t, committees] = await Promise.all([getTranslations("Committees"), getPublicCommittees()]);
  return (
    <div className={pub.container}>
      <PageHeader title={t("title")} intro={t("intro")} />
      <ul className="grid gap-3 sm:grid-cols-2">
        {committees.map((c) => (
          <li key={c.slug} className={pub.card}>
            <h2 className={pub.h3}>
              <NavLink href={`/committees/${c.slug}`}>{c.name}</NavLink>
            </h2>
            {c.description && <p className="mt-1">{excerpt(c.description, 140)}</p>}
            {c.meetingInfo && <p className="mt-1 text-sm text-muted">{c.meetingInfo}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
