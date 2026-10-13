// Shared building blocks for public pages. Server components only: the public site ships no
// JavaScript of its own (docs/PLAN.md §3).

import type { ReactNode } from "react";
import { getFormatter, getTranslations } from "next-intl/server";
import { NavLink } from "@/components/public/nav-link";
import { renderMarkdown } from "@/lib/markdown";
import { formatPhone } from "@/lib/phone";
import { whatsAppChatUrl, whatsAppShareUrl } from "@/lib/share-text";

export const pub = {
  container: "mx-auto w-full max-w-3xl px-4",
  h1: "text-3xl font-bold text-azure-900",
  h2: "text-2xl font-bold text-azure-900",
  h3: "text-lg font-bold text-azure-900",
  card: "rounded-lg border border-line bg-white p-4",
  muted: "text-muted",
  primary:
    "inline-flex min-h-11 items-center justify-center rounded-lg bg-azure-700 px-5 font-semibold text-white no-underline hover:bg-azure-900",
  secondary:
    "inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-azure-700 bg-white px-4 font-semibold text-azure-700 no-underline hover:bg-azure-50",
  badge: "inline-block rounded border px-2 py-0.5 text-sm font-semibold",
} as const;

/** Limited Markdown, rendered and escaped on the server (src/lib/markdown.ts). */
export function Prose({ source, className = "" }: { source: string; className?: string }) {
  return <div className={`prose ${className}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />;
}

export function PageHeader({ title, intro, back }: { title: string; intro?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="space-y-2 pb-6 pt-8">
      {back && (
        <p>
          <NavLink href={back.href} className="inline-flex min-h-11 items-center">
            ← {back.label}
          </NavLink>
        </p>
      )}
      <h1 className={pub.h1}>{title}</h1>
      {intro && <p className={pub.muted}>{intro}</p>}
    </header>
  );
}

export async function ShareOnWhatsApp({ text, title }: { text: string; title: string }) {
  const t = await getTranslations("Content");
  return (
    <a href={whatsAppShareUrl(text)} rel="noopener" className="inline-flex min-h-11 items-center">
      {t("shareWhatsApp")}
      <span className="sr-only">: {title}</span>
    </a>
  );
}

/** "Sun 18 Oct, 9:00 – 10:30 am" in Lusaka time. */
export async function When({ start, end }: { start: Date; end: Date }) {
  const format = await getFormatter();
  return (
    <time dateTime={start.toISOString()}>
      {format.dateTimeRange(start, end, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
    </time>
  );
}

export async function OccurrenceBadges({ cancelled, moved, note }: { cancelled: boolean; moved: boolean; note: string | null }) {
  if (!cancelled && !moved && !note) return null;
  const t = await getTranslations("Content");
  return (
    <span className="flex flex-wrap items-center gap-2">
      {cancelled && <span className={`${pub.badge} border-danger text-danger`}>{t("cancelled")}</span>}
      {moved && <span className={`${pub.badge} border-warning text-warning`}>{t("moved")}</span>}
      {note && <span className="text-sm text-muted">{note}</span>}
    </span>
  );
}

export type Contact = { role: string; name: string; phone: string; whatsapp: boolean };

export async function ContactList({ contacts }: { contacts: readonly Contact[] }) {
  const t = await getTranslations("Content");
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {contacts.map((c) => (
        <li key={`${c.role}-${c.phone}`} className={pub.card}>
          <p className="text-sm text-muted">{c.role}</p>
          <p className="font-semibold">{c.name}</p>
          <p className="mt-1 flex flex-wrap gap-x-4">
            <a href={`tel:${c.phone}`} className="inline-flex min-h-11 items-center">
              {formatPhone(c.phone)}
            </a>
            {c.whatsapp && (
              <a href={whatsAppChatUrl(c.phone)} rel="noopener" className="inline-flex min-h-11 items-center">
                {t("chatWhatsApp")}
                <span className="sr-only"> {c.name}</span>
              </a>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
