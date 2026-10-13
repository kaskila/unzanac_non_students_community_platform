// Times are stored in UTC and shown in Africa/Lusaka (docs/PLAN.md §6).
// Zambia uses Central Africa Time, UTC+2 all year with no daylight saving, so converting between
// Lusaka wall-clock time and UTC is a fixed shift. tests/unit/dates.test.ts guards that assumption.

export const TIME_ZONE = "Africa/Lusaka";
export const LUSAKA_OFFSET_MINUTES = 120;
const OFFSET_MS = LUSAKA_OFFSET_MINUTES * 60_000;

/** A Date whose UTC fields read as Lusaka wall-clock time. Only for calendar arithmetic. */
export function toWallClock(date: Date): Date {
  return new Date(date.getTime() + OFFSET_MS);
}

/** Inverse of toWallClock. */
export function fromWallClock(wall: Date): Date {
  return new Date(wall.getTime() - OFFSET_MS);
}

/** Parse a `<input type="datetime-local">` value ("2026-10-18T09:00") as Lusaka time. */
export function parseLocalDateTime(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const wall = new Date(Date.UTC(y, mo - 1, d, h, mi));
  // Reject impossible dates such as 31 February, which Date.UTC would roll over.
  if (wall.getUTCMonth() !== mo - 1 || wall.getUTCDate() !== d || h > 23 || mi > 59) return null;
  return fromWallClock(wall);
}

/** Format a Date as a `datetime-local` value in Lusaka time. */
export function toLocalInput(date: Date | null | undefined): string {
  if (!date) return "";
  return toWallClock(date).toISOString().slice(0, 16);
}

/** Lusaka calendar date of `date`, as "YYYY-MM-DD". */
export function localDateKey(date: Date): string {
  return toWallClock(date).toISOString().slice(0, 10);
}
