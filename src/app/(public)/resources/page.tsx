import { Suspense } from "react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { NavLink } from "@/components/public/nav-link";
import { PageHeader, pub } from "@/components/public/ui";
import { formatBytes, kindLabel } from "@/lib/file-rules";
import { getPublicMaterials } from "@/server/public";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Resources");
  return { title: t("title") };
}

type Props = PageProps<"/resources">;

export default async function ResourcesPage({ searchParams }: Props) {
  const t = await getTranslations("Resources");
  return (
    <div className={pub.container}>
      <PageHeader title={t("title")} intro={t("intro")} />
      {/* A plain GET form: search works without JavaScript. */}
      <form action="/resources" role="search" className="mb-6 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="q" className="block font-semibold">
            {t("search")}
          </label>
          <Suspense fallback={<SearchInput value="" />}>
            {searchParams.then((p) => (
              <SearchInput value={typeof p.q === "string" ? p.q : ""} />
            ))}
          </Suspense>
        </div>
        <button type="submit" className={pub.secondary}>
          {t("searchButton")}
        </button>
      </form>
      <Suspense fallback={<p>{t("loading")}</p>}>
        <MaterialList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function SearchInput({ value }: { value: string }) {
  return (
    <input
      id="q"
      name="q"
      type="search"
      defaultValue={value}
      className="mt-1 block min-h-11 w-full rounded-md border border-muted bg-white px-3"
    />
  );
}

async function MaterialList({ searchParams }: Pick<Props, "searchParams">) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  const [t, tc, format, all] = await Promise.all([
    getTranslations("Resources"),
    getTranslations("Content"),
    getFormatter(),
    getPublicMaterials(),
  ]);
  const materials = query
    ? all.filter((m) => `${m.title} ${m.description ?? ""}`.toLowerCase().includes(query))
    : all;

  if (materials.length === 0) return <p className={pub.muted}>{query ? t("noResults") : t("empty")}</p>;

  const byCategory = new Map<string, typeof materials>();
  for (const m of materials) byCategory.set(m.category, [...(byCategory.get(m.category) ?? []), m]);

  return (
    <div className="space-y-8">
      {[...byCategory].map(([category, list]) => (
        <section key={category} aria-labelledby={`cat-${category}`}>
          <h2 id={`cat-${category}`} className={`${pub.h2} mb-3`}>
            {tc(`materialCategories.${category}`)}
          </h2>
          <ul className="space-y-3">
            {list.map((m) => (
              <li key={m.slug} className={pub.card}>
                <NavLink href={`/resources/${m.slug}`} className="font-semibold">
                  {m.title}
                </NavLink>
                {m.currentFile && (
                  <p className="text-sm text-muted">
                    {kindLabel(m.currentFile.mimeType)} · {formatBytes(m.currentFile.sizeBytes)} ·{" "}
                    {t("updated", { date: format.dateTime(m.currentFile.uploadedAt, { dateStyle: "medium" }) })}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
