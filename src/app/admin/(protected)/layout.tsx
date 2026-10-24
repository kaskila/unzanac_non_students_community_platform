import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AdminNav } from "./admin-nav";

export default async function ProtectedLayout({ children }: LayoutProps<"/admin">) {
  const t = await getTranslations("Admin");
  return (
    <>
      <header className="border-b border-line bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 px-4 pt-2">
          <Link href="/admin" className="flex min-h-11 items-center gap-2 text-lg font-bold text-azure-900 no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/emblem-80.webp" width={32} height={32} alt="" className="rounded" />
            {t("title")}
          </Link>
          {/* Fallback keeps the header's height while the signed-in admin is checked. */}
          <Suspense fallback={<div className="h-11 basis-full" />}>
            <AdminNav />
          </Suspense>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Suspense fallback={<p>{t("loading")}</p>}>{children}</Suspense>
      </main>
    </>
  );
}
