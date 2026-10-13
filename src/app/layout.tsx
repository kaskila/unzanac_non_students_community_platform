import type { Metadata, Viewport } from "next";
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE } from "@/i18n/request";
import { BRAND_THEME_COLOR } from "@/lib/site";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Site");
  return {
    title: { default: `${t("name")} · ${t("tagline")}`, template: `%s · ${t("name")}` },
    description: t("description"),
    applicationName: t("name"),
  };
}

export const viewport: Viewport = {
  themeColor: BRAND_THEME_COLOR,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
