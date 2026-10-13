// Recurring events (docs/PLAN.md §5). Events store an RFC 5545 RRULE, limited to the patterns a
// congregation uses and the admin form offers:
//   FREQ=WEEKLY;INTERVAL=n            every n weeks, on the first date's weekday
//   FREQ=MONTHLY;BYMONTHDAY=d         every month on day d (months without that day are skipped)
//   FREQ=MONTHLY;BYDAY=2SU / -1SU     every month on the 2nd (or last) weekday
// each with an optional UNTIL. The same string goes into .ics files, so calendar apps agree with the site.
// All calendar arithmetic happens in Lusaka wall-clock time (src/lib/dates.ts).

import { fromWallClock, toWallClock } from "@/lib/dates";

export const RECURRENCE_CHOICES = [
  "none",
  "weekly",
  "fortnightly",
  "monthly_date",
  "monthly_weekday",
  "monthly_last_weekday",
] as const;
export type RecurrenceChoice = (typeof RECURRENCE_CHOICES)[number];

export type Recurrence =
  | { freq: "WEEKLY"; interval: number; until: Date | null }
  | { freq: "MONTHLY"; monthDay: number; until: Date | null }
  | { freq: "MONTHLY"; nth: number; weekday: number; until: Date | null };

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
const DAY_MS = 86_400_000;
const MAX_STEPS = 2000;

/** Which week of the month a date falls in: 1–4, or 5 for a fifth occurrence. */
export function weekOfMonth(wallDay: number): number {
  return Math.ceil(wallDay / 7);
}

function formatUntil(until: Date): string {
  return until.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function parseUntil(value: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, s));
}

/**
 * Build the RRULE for a form choice, based on the first occurrence's start.
 * Returns null for a one-off event. Throws for a choice that doesn't fit the date
 * (e.g. "2nd Sunday" when the first date is the 5th Sunday of its month).
 */
export function buildRRule(choice: RecurrenceChoice, startsAt: Date, until: Date | null = null): string | null {
  if (choice === "none") return null;
  const wall = toWallClock(startsAt);
  const day = DAY_CODES[wall.getUTCDay()];
  const parts: string[] = [];
  switch (choice) {
    case "weekly":
      parts.push("FREQ=WEEKLY", "INTERVAL=1");
      break;
    case "fortnightly":
      parts.push("FREQ=WEEKLY", "INTERVAL=2");
      break;
    case "monthly_date":
      parts.push("FREQ=MONTHLY", `BYMONTHDAY=${wall.getUTCDate()}`);
      break;
    case "monthly_weekday": {
      const nth = weekOfMonth(wall.getUTCDate());
      if (nth > 4) throw new Error("fifth_weekday");
      parts.push("FREQ=MONTHLY", `BYDAY=${nth}${day}`);
      break;
    }
    case "monthly_last_weekday": {
      const nextWeek = new Date(wall.getTime() + 7 * DAY_MS);
      if (nextWeek.getUTCMonth() === wall.getUTCMonth()) throw new Error("not_last_weekday");
      parts.push("FREQ=MONTHLY", `BYDAY=-1${day}`);
      break;
    }
  }
  if (until) parts.push(`UNTIL=${formatUntil(until)}`);
  return parts.join(";");
}

/** Parse one of our RRULE strings. Returns null for anything outside the supported subset. */
export function parseRRule(rrule: string | null | undefined): Recurrence | null {
  if (!rrule) return null;
  const fields = new Map(
    rrule.split(";").map((part) => {
      const [key, value = ""] = part.split("=");
      return [key.toUpperCase(), value.toUpperCase()] as const;
    }),
  );
  const until = fields.has("UNTIL") ? parseUntil(fields.get("UNTIL")!) : null;
  if (fields.has("UNTIL") && !until) return null;

  if (fields.get("FREQ") === "WEEKLY") {
    const interval = Number(fields.get("INTERVAL") ?? "1");
    if (!Number.isInteger(interval) || interval < 1 || interval > 52) return null;
    return { freq: "WEEKLY", interval, until };
  }
  if (fields.get("FREQ") === "MONTHLY") {
    if (fields.has("BYMONTHDAY")) {
      const monthDay = Number(fields.get("BYMONTHDAY"));
      if (!Number.isInteger(monthDay) || monthDay < 1 || monthDay > 31) return null;
      return { freq: "MONTHLY", monthDay, until };
    }
    const byDay = /^(-1|[1-4])(SU|MO|TU|WE|TH|FR|SA)$/.exec(fields.get("BYDAY") ?? "");
    if (byDay) {
      return { freq: "MONTHLY", nth: Number(byDay[1]), weekday: DAY_CODES.indexOf(byDay[2] as never), until };
    }
  }
  return null;
}

/** The form choice that produced an RRULE, for the edit screen. */
export function recurrenceChoice(rrule: string | null | undefined): RecurrenceChoice {
  const r = parseRRule(rrule);
  if (!r) return "none";
  if (r.freq === "WEEKLY") return r.interval === 2 ? "fortnightly" : "weekly";
  if ("monthDay" in r) return "monthly_date";
  return r.nth === -1 ? "monthly_last_weekday" : "monthly_weekday";
}

/** The nth (or last, nth = -1) given weekday of a month, as a wall-clock date at 00:00. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date | null {
  if (nth === -1) {
    const last = new Date(Date.UTC(year, month + 1, 0));
    const back = (last.getUTCDay() - weekday + 7) % 7;
    return new Date(last.getTime() - back * DAY_MS);
  }
  const first = new Date(Date.UTC(year, month, 1));
  const forward = (weekday - first.getUTCDay() + 7) % 7;
  const date = new Date(first.getTime() + (forward + (nth - 1) * 7) * DAY_MS);
  return date.getUTCMonth() === month ? date : null;
}

/** Original start times of every occurrence that starts before `to`, in order. Lazy. */
function* occurrenceStarts(startsAt: Date, rule: Recurrence | null, from: Date, to: Date): Generator<Date> {
  if (!rule) {
    if (startsAt < to) yield startsAt;
    return;
  }
  const wallStart = toWallClock(startsAt);
  const timeOfDay = wallStart.getTime() % DAY_MS;
  const stop = rule.until && rule.until < to ? new Date(rule.until.getTime() + 1) : to;

  if (rule.freq === "WEEKLY") {
    const step = rule.interval * 7 * DAY_MS;
    // Skip straight to the first step near `from` instead of walking from the first date.
    const skip = Math.max(0, Math.floor((from.getTime() - startsAt.getTime()) / step) - 1);
    for (let k = skip, n = 0; n < MAX_STEPS; k++, n++) {
      const start = new Date(startsAt.getTime() + k * step);
      if (start >= stop) return;
      yield start;
    }
    return;
  }

  const fromWall = toWallClock(from);
  let year = wallStart.getUTCFullYear();
  let month = wallStart.getUTCMonth();
  // Monthly rules: start one month before `from` (or at the first date, if later).
  const fromIndex = fromWall.getUTCFullYear() * 12 + fromWall.getUTCMonth() - 1;
  if (fromIndex > year * 12 + month) {
    year = Math.floor(fromIndex / 12);
    month = fromIndex % 12;
  }
  for (let n = 0; n < MAX_STEPS; n++, month++) {
    if (month === 12) {
      month = 0;
      year++;
    }
    let day: Date | null;
    if ("monthDay" in rule) {
      day = new Date(Date.UTC(year, month, rule.monthDay));
      if (day.getUTCMonth() !== month) day = null; // e.g. the 31st in a 30-day month
    } else {
      day = nthWeekdayOfMonth(year, month, rule.weekday, rule.nth);
    }
    if (!day) continue;
    const start = fromWallClock(new Date(day.getTime() + timeOfDay));
    if (start < startsAt) continue;
    if (start >= stop) return;
    yield start;
  }
}

export type EventTiming = { startsAt: Date; endsAt: Date; rrule: string | null };
export type OccurrenceException = {
  occurrenceStart: Date;
  cancelled: boolean;
  newStart: Date | null;
  newEnd: Date | null;
  note: string | null;
};
export type Occurrence = {
  originalStart: Date; // identifies the date for exceptions
  start: Date;
  end: Date;
  cancelled: boolean;
  moved: boolean;
  note: string | null;
};

/**
 * Occurrences of an event that overlap [from, to), with cancellations and moves applied.
 * Cancelled dates are included (flagged) so pages can say "Cancelled" rather than silently skip.
 */
export function expandOccurrences(
  event: EventTiming,
  exceptions: readonly OccurrenceException[],
  from: Date,
  to: Date,
  limit = 50,
): Occurrence[] {
  const rule = parseRRule(event.rrule);
  const duration = event.endsAt.getTime() - event.startsAt.getTime();
  const byStart = new Map(exceptions.map((e) => [e.occurrenceStart.getTime(), e]));
  // A moved date can land inside the window from outside it, so scan a month either side.
  const margin = 31 * DAY_MS;
  const scanFrom = new Date(from.getTime() - margin - duration);
  const scanTo = new Date(to.getTime() + margin);

  const result: Occurrence[] = [];
  for (const originalStart of occurrenceStarts(event.startsAt, rule, scanFrom, scanTo)) {
    const exception = byStart.get(originalStart.getTime());
    const start = exception?.newStart ?? originalStart;
    const end = exception?.newEnd ?? new Date(start.getTime() + duration);
    if (end <= from || start >= to) continue;
    result.push({
      originalStart,
      start,
      end,
      cancelled: exception?.cancelled ?? false,
      moved: !!exception?.newStart && exception.newStart.getTime() !== originalStart.getTime(),
      note: exception?.note ?? null,
    });
  }
  result.sort((a, b) => a.start.getTime() - b.start.getTime());
  return result.slice(0, limit);
}

/** Whether `start` is a real occurrence of the event (used to validate exceptions). */
export function isOccurrence(event: EventTiming, start: Date): boolean {
  const rule = parseRRule(event.rrule);
  const to = new Date(start.getTime() + 1);
  for (const candidate of occurrenceStarts(event.startsAt, rule, new Date(start.getTime() - DAY_MS), to)) {
    if (candidate.getTime() === start.getTime()) return true;
  }
  return false;
}
