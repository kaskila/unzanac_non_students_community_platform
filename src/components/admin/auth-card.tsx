import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { ui } from "@/components/admin/ui";

/** Centered card used by the sign-in, 2FA and invite screens. */
export async function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  const t = await getTranslations("Site");
  return (
    <main id="main" className="flex flex-1 flex-col items-center bg-azure-50 px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/emblem-80.webp" width={40} height={40} alt={t("emblemAlt")} className="rounded" />
        <span className="text-xl font-bold text-azure-900">{t("name")} Admin</span>
      </div>
      <div className={`${ui.card} w-full max-w-md`}>
        <h1 className={ui.h1}>{title}</h1>
        <div className="mt-4">{children}</div>
      </div>
    </main>
  );
}
