"use client";

import { usePathname } from "next/navigation";
import { NavLink } from "@/components/public/nav-link";

export const menuLinkClass = "inline-flex min-h-11 items-center text-[18.7px] font-bold uppercase text-white no-underline";

function isCurrent(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * One menu link; `current` marks the page being viewed (aria-current). The marked version reads
 * the URL, so the header renders it inside <Suspense> per link: only links swap in, never the
 * menu around them, so a "Menu" opened before the swap stays open.
 */
export function MenuLink({ href, label, current = false }: { href: string; label: string; current?: boolean }) {
  return (
    <NavLink
      href={href}
      aria-current={current ? "page" : undefined}
      className={`${menuLinkClass} ${current ? "underline decoration-2 underline-offset-8" : "hover:underline hover:underline-offset-8"}`}
    >
      {label}
    </NavLink>
  );
}

export function CurrentMenuLink({ href, label }: { href: string; label: string }) {
  return <MenuLink href={href} label={label} current={isCurrent(usePathname(), href)} />;
}
