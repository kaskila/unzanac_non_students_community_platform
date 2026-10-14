import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { NavLink } from "@/components/public/nav-link";
import { PageHeader, pub, ShareOnWhatsApp } from "@/components/public/ui";
import { formatBytes, kindLabel } from "@/lib/file-rules";
import { shareText } from "@/lib/share-text";
import { siteUrl } from "@/lib/site";
import { getPublicMaterial } from "@/server/public";

type Props = PageProps<"/resources/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const material = await getPublicMaterial((await params).slug);
  if (!material) return {};
  // Unlisted items are reachable by link only: keep them out of search engines too.
  return { title: material.title, robots: material.visibility === "UNLISTED" ? { index: false } : undefined };
}

export default async function ResourcePage({ params }: Props) {
  const t = await getTranslations("Content");
  return (
    <div className={pub.container}>
      <Suspense fallback={<p className="pt-8">{t("loading")}</p>}>
        <Resource params={params} />
      </Suspense>
    </div>
  );
}

async function Resource({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const [t, tc, format, material] = await Promise.all([
    getTranslations("Resources"),
    getTranslations("Content"),
    getFormatter(),
    getPublicMaterial(slug),
  ]);
  if (!material?.currentFile) notFound();
  const file = material.currentFile;
  const size = `${kindLabel(file.mimeType)} · ${formatBytes(file.sizeBytes)}`;

  return (
    <article className="space-y-4">
      <PageHeader title={material.title} back={{ href: "/resources", label: t("back") }} intro={tc(`materialCategories.${material.category}`)} />
      {material.description && <p className="whitespace-pre-line">{material.description}</p>}
      <dl className="grid grid-cols-2 gap-3 sm:max-w-sm">
        <div>
          <dt className="text-sm text-muted">{t("type")}</dt>
          <dd className="font-semibold">{size}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t("updatedLabel")}</dt>
          <dd className="font-semibold">{format.dateTime(file.uploadedAt, { dateStyle: "medium" })}</dd>
        </div>
      </dl>
      <p>
        {/* A download, not a page: plain link so the browser saves the file. */}
        <a href={`/resources/${material.slug}/download`} className={pub.primary}>
          {t("download", { size })}
        </a>
      </p>
      {material.committee?.isPublic && (
        <p>
          <NavLink href={`/committees/${material.committee.slug}`}>{material.committee.name}</NavLink>
        </p>
      )}
      <ShareOnWhatsApp
        title={material.title}
        text={shareText({ title: material.title, body: material.description, url: siteUrl(`/resources/${material.slug}`), extra: size })}
      />
    </article>
  );
}
