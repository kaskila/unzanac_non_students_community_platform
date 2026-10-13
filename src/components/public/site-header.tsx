import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function SiteHeader() {
  const t = await getTranslations("Site");
  return (
    <header className="border-b-4 border-azure-500 bg-white">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex min-h-11 items-center gap-3 no-underline">
          {/* Plain <img>: next/image would add client JavaScript for a 2 KB file. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/emblem-80.webp" width={40} height={40} alt={t("emblemAlt")} className="rounded" />
          <span className="flex flex-col leading-tight">
            <span className="text-xl font-bold text-azure-900">{t("name")}</span>
            <span className="text-sm text-muted">{t("tagline")}</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
