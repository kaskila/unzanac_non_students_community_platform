import { NavLink } from "@/components/public/nav-link";

export type SiteNavProps = Props;

type Props = {
  links: { href: string; label: string }[];
  labels: { label: string; menu: string; search: string; searchPlaceholder: string };
};

// White text on brand Azure is 3.27:1, enough only for large text: menu text is 19px bold
// (WCAG "large", 3:1). No hooks here: CurrentSiteNav (client) passes the current path, and the
// header renders this without one as the Suspense fallback in the prerendered shell.
const linkClass = "inline-flex min-h-11 items-center text-[19px] font-bold uppercase tracking-wide text-white no-underline";

function isCurrent(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

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

export function SiteNav({ links, labels, pathname = null }: Props & { pathname?: string | null }) {
  const items = links.map((link) => {
    const current = pathname !== null && isCurrent(pathname, link.href);
    return (
      <li key={link.href}>
        <NavLink
          href={link.href}
          aria-current={current ? "page" : undefined}
          className={`${linkClass} ${current ? "underline decoration-2 underline-offset-8" : "hover:underline hover:underline-offset-8"}`}
        >
          {link.label}
        </NavLink>
      </li>
    );
  });

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
