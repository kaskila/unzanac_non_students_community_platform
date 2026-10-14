import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { SkipLink } from "@/components/skip-link";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" className="flex-1 leading-relaxed">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
