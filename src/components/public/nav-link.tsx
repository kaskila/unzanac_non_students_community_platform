import type { ComponentProps } from "react";
import Link from "next/link";

/**
 * Internal link for public pages. Prefetching is off: on mobile data, downloading every linked
 * page in advance costs visitors more than it saves. Navigation still avoids a full page reload.
 */
export function NavLink(props: ComponentProps<typeof Link>) {
  return <Link prefetch={false} {...props} />;
}
