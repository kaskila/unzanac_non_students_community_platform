"use client";

import { usePathname } from "next/navigation";
import { SiteNav, type SiteNavProps } from "@/components/public/site-nav";

/** The menu bar with the current page marked (aria-current). */
export function CurrentSiteNav(props: SiteNavProps) {
  return <SiteNav {...props} pathname={usePathname()} />;
}
