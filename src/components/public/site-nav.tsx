import { Suspense } from "react";
import { CurrentMenuLink, MenuLink, menuLinkClass } from "@/components/public/current-site-nav";

type Props = {
  links: { href: string; label: string }[];
  labels: { label: string; menu: string; search: string; searchPlaceholder: string };
};

// White text on brand Azure is 3.27:1, enough only for large text: menu text is 18.7px bold, the
// smallest size WCAG counts as large (14pt bold), so 3:1 applies. Don't go smaller on this Azure.
// The bar is static (prerendered); only each link's current-page mark is filled in per request.
const linkClass = menuLinkClass;

function SearchForm({ labels }: { labels: Props["labels"] }) {
  return (
    // A plain GET form: search works without JavaScript.
    <form action="/search" role="search" className="flex w-full items-center rounded-lg bg-white md:w-60">
      <label htmlFor="site-search" className="sr-only">
        {labels.search}
      </label>
      <input
        id="site-search"
        name="q"
        type="search"
        placeholder={labels.searchPlaceholder}
        className="min-h-11 w-full min-w-0 rounded-l-lg bg-white px-4 text-ink placeholder:text-muted"
      />
      <button type="submit" className="flex min-h-11 min-w-11 items-center justify-center text-azure-700" aria-label={labels.search}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-none stroke-current stroke-[1.5]">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15.5 15.5 5 5" />
        </svg>
      </button>
    </form>
  );
}

export function SiteNav({ links, labels }: Props) {
  const items = links.map((link) => (
    <li key={link.href}>
      <Suspense fallback={<MenuLink href={link.href} label={link.label} />}>
        <CurrentMenuLink href={link.href} label={link.label} />
      </Suspense>
    </li>
  ));

  return (
    <nav aria-label={labels.label} className="bg-azure-500 px-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 py-2">
        {/* Phones: a "Menu" disclosure (works without JavaScript). */}
        <details className="w-full md:hidden">
          <summary className={`${linkClass} cursor-pointer list-none`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="mr-2 size-6 fill-none stroke-current stroke-2">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            {labels.menu}
          </summary>
          <ul className="pb-2">{items}</ul>
        </details>
        {/* Wider screens: the mockup's single bar. */}
        <ul className="hidden flex-wrap gap-x-6 md:flex lg:gap-x-9">{items}</ul>
        <div className="w-full pb-1 md:ml-auto md:w-auto md:pb-0">
          <SearchForm labels={labels} />
        </div>
      </div>
    </nav>
  );
}
