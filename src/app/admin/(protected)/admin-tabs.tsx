"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type TabGroup = { label: string | null; links: { href: string; label: string }[] };

function isCurrent(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The admin menu: one row of tabs, grouped (Content · Website · People) with thin dividers.
 * Scrolls sideways on phones instead of wrapping; the current page has an Azure bar.
 */
export function AdminTabs({ groups, label }: { groups: TabGroup[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="-mb-px overflow-x-auto [scrollbar-width:thin]">
      <div className="flex items-stretch whitespace-nowrap">
        {groups.map((group, i) => (
          <ul
            key={group.label ?? i}
            aria-label={group.label ?? undefined}
            className={`flex items-stretch ${i > 0 ? "ml-1.5 border-l border-line pl-1.5" : ""}`}
          >
            {group.links.map((link) => {
              const current = isCurrent(pathname, link.href);
              return (
                <li key={link.href} className="flex">
                  <Link
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    className={`flex min-h-12 items-center border-b-[3px] px-2.5 text-[15px] font-semibold no-underline ${
                      current
                        ? "border-azure-500 text-azure-900"
                        : "border-transparent text-ink hover:border-azure-100 hover:text-azure-700"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}
      </div>
    </nav>
  );
}
