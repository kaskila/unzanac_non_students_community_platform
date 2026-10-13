import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AdminNav } from "./admin-nav";

export default async function ProtectedLayout({ children }: LayoutProps<"/admin">) {
  const t = await getTranslations("Admin");
  return (
    <>
      <header className="border-b-4 border-azure-500 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin" className="flex min-h-11 items-center gap-2 font-bold text-azure-900 no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/emblem-80.webp" width={32} height={32} alt="" className="rounded" />
            {t("title")}
          </Link>
          <Suspense>
            <AdminNav />
          </Suspense>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Suspense fallback={<p>{t("loading")}</p>}>{children}</Suspense>
      </main>
    </>
  );
}
