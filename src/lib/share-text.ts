// WhatsApp-ready text (docs/PLAN.md §3): title, short body, link. Built on the server, so the
// "Share on WhatsApp" link works without JavaScript.

import { excerpt } from "@/lib/markdown";

const MAX_BODY = 280;

export function shareText(input: { title: string; body?: string | null; url: string; extra?: string | null }): string {
  const parts = [`*${input.title.trim()}*`];
  if (input.extra) parts.push(input.extra.trim());
  if (input.body) {
    const body = excerpt(input.body, MAX_BODY);
    if (body) parts.push(body);
  }
  parts.push(input.url);
  return parts.join("\n\n");
}

/** wa.me link that opens WhatsApp with the text ready to send to any chat. */
export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** wa.me click-to-chat link for a phone number in E.164 form. */
export function whatsAppChatUrl(e164: string): string {
  return `https://wa.me/${e164.replace(/\D/g, "")}`;
}
