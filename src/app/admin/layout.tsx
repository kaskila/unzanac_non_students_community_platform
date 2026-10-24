import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { SkipLink } from "@/components/skip-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <NextIntlClientProvider>
      <SkipLink />
      {children}
    </NextIntlClientProvider>
  );
}
