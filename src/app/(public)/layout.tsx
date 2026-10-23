import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { SkipLink } from "@/components/skip-link";

// Public layout (landing redesign): a grey page with the white header card, the Azure menu bar
// and a white content panel, all in one centred column. Full width on phones.
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col bg-paper">
      <SkipLink />
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 bg-white pb-12 leading-relaxed">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
