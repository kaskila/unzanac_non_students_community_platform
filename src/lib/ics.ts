// iCalendar (RFC 5545) files for "Add to calendar" (docs/PLAN.md §3, /events/[slug]/ics).
// Times are written in Africa/Lusaka with a VTIMEZONE block, so recurring rules such as
// "2nd Sunday" expand on the right day in every calendar app.

import { TIME_ZONE, toWallClock } from "@/lib/dates";
import type { OccurrenceException } from "@/lib/recurrence";

export type IcsEvent = {
  uid: string; // stable id, e.g. "<event id>@unzanac"
  title: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  startsAt: Date;
  endsAt: Date;
  rrule?: string | null;
  updatedAt: Date;
  exceptions?: readonly OccurrenceException[];
};

/** Escape TEXT values (RFC 5545 §3.3.11). */
export function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

/** Fold lines longer than 75 octets (RFC 5545 §3.1). */
export function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const charSize = new TextEncoder().encode(char).length;
    const max = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (size + charSize > max) {
      out.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += charSize;
  }
  out.push(current);
  return out.join("\r\n ");
}

function localStamp(date: Date): string {
  return toWallClock(date).toISOString().replace(/[-:]/g, "").slice(0, 15); // 20261018T090000
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${TIME_ZONE}`,
  "BEGIN:STANDARD",
  "DTSTART:19700101T000000",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0200",
  "TZNAME:CAT",
  "END:STANDARD",
  "END:VTIMEZONE",
];

function eventLines(event: IcsEvent, now: Date): string[] {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `LAST-MODIFIED:${utcStamp(event.updatedAt)}`,
    `DTSTART;TZID=${TIME_ZONE}:${localStamp(event.startsAt)}`,
    `DTEND;TZID=${TIME_ZONE}:${localStamp(event.endsAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
  ];
  if (event.rrule) lines.push(`RRULE:${event.rrule}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.url) lines.push(`URL:${event.url}`);

  const exceptions = event.rrule ? (event.exceptions ?? []) : [];
  // Cancelled and moved dates are removed from the series; moved ones come back as overrides below.
  for (const e of exceptions.filter((e) => e.cancelled || e.newStart)) {
    lines.push(`EXDATE;TZID=${TIME_ZONE}:${localStamp(e.occurrenceStart)}`);
  }
  lines.push("END:VEVENT");

  for (const e of exceptions.filter((e) => !e.cancelled && e.newStart)) {
    const start = e.newStart!;
    const end = e.newEnd ?? new Date(start.getTime() + (event.endsAt.getTime() - event.startsAt.getTime()));
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}-${utcStamp(e.occurrenceStart)}`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART;TZID=${TIME_ZONE}:${localStamp(start)}`,
      `DTEND;TZID=${TIME_ZONE}:${localStamp(end)}`,
      `SUMMARY:${escapeText(event.title)}`,
    );
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    const description = [e.note, event.description].filter(Boolean).join("\n\n");
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
    lines.push("END:VEVENT");
  }
  return lines;
}

export function buildIcs(event: IcsEvent, now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UNZANAC//Community Platform//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...VTIMEZONE,
    ...eventLines(event, now),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
