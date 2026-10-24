import { describe, expect, it } from "vitest";
import { parseLocalDateTime, toLocalInput } from "@/lib/dates";
import { buildRRule, expandOccurrences, isOccurrence, parseRRule, recurrenceChoice } from "@/lib/recurrence";

const at = (value: string) => parseLocalDateTime(value)!;
const starts = (list: { start: Date }[]) => list.map((o) => toLocalInput(o.start));

// Sunday 18 Oct 2026 is the 3rd Sunday of October.
const SUNDAY = at("2026-10-18T09:00");
const SUNDAY_END = at("2026-10-18T10:30");

describe("buildRRule", () => {
  it("builds each supported pattern from the first date", () => {
    expect(buildRRule("none", SUNDAY)).toBeNull();
    expect(buildRRule("weekly", SUNDAY)).toBe("FREQ=WEEKLY;INTERVAL=1");
    expect(buildRRule("fortnightly", SUNDAY)).toBe("FREQ=WEEKLY;INTERVAL=2");
    expect(buildRRule("monthly_date", SUNDAY)).toBe("FREQ=MONTHLY;BYMONTHDAY=18");
    expect(buildRRule("monthly_weekday", SUNDAY)).toBe("FREQ=MONTHLY;BYDAY=3SU");
    expect(buildRRule("monthly_last_weekday", at("2026-10-25T09:00"))).toBe("FREQ=MONTHLY;BYDAY=-1SU");
  });

  it("uses the Lusaka weekday, not the UTC one", () => {
    // 01:00 on Sunday in Lusaka is still Saturday in UTC.
    expect(buildRRule("monthly_weekday", at("2026-10-18T01:00"))).toBe("FREQ=MONTHLY;BYDAY=3SU");
  });

  it("refuses patterns that don't fit the date", () => {
    expect(() => buildRRule("monthly_weekday", at("2026-11-29T09:00"))).toThrow("fifth_weekday");
    expect(() => buildRRule("monthly_last_weekday", SUNDAY)).toThrow("not_last_weekday");
  });

  it("adds UNTIL in UTC and round-trips through the parser and the form choice", () => {
    const rule = buildRRule("weekly", SUNDAY, at("2026-12-31T23:59"));
    expect(rule).toBe("FREQ=WEEKLY;INTERVAL=1;UNTIL=20261231T215900Z");
    expect(parseRRule(rule)).toEqual({ freq: "WEEKLY", interval: 1, until: at("2026-12-31T23:59") });
    for (const choice of ["weekly", "fortnightly", "monthly_date", "monthly_weekday"] as const) {
      expect(recurrenceChoice(buildRRule(choice, SUNDAY))).toBe(choice);
    }
    expect(recurrenceChoice(null)).toBe("none");
  });

  it("rejects rules outside the supported subset", () => {
    expect(parseRRule("FREQ=DAILY")).toBeNull();
    expect(parseRRule("FREQ=MONTHLY;BYDAY=5SU")).toBeNull();
    expect(parseRRule("FREQ=WEEKLY;UNTIL=tomorrow")).toBeNull();
  });
});

describe("expandOccurrences", () => {
  const weekly = { startsAt: SUNDAY, endsAt: SUNDAY_END, rrule: "FREQ=WEEKLY;INTERVAL=1" };

  it("lists weekly dates inside the window, keeping the Lusaka time", () => {
    const list = expandOccurrences(weekly, [], at("2026-10-19T00:00"), at("2026-11-09T00:00"));
    expect(starts(list)).toEqual(["2026-10-25T09:00", "2026-11-01T09:00", "2026-11-08T09:00"]);
    expect(toLocalInput(list[0].end)).toBe("2026-10-25T10:30");
  });

  it("includes an occurrence that is in progress", () => {
    const list = expandOccurrences(weekly, [], at("2026-10-18T10:00"), at("2026-10-19T00:00"));
    expect(starts(list)).toEqual(["2026-10-18T09:00"]);
  });

  it("jumps ahead efficiently for old series", () => {
    const list = expandOccurrences(weekly, [], at("2036-10-20T00:00"), at("2036-10-27T00:00"));
    expect(starts(list)).toEqual(["2036-10-26T09:00"]);
  });

  it("never lists dates before the first one, and stops at UNTIL", () => {
    const rule = { ...weekly, rrule: buildRRule("weekly", SUNDAY, at("2026-11-01T23:59")) };
    expect(starts(expandOccurrences(rule, [], at("2026-01-01T00:00"), at("2027-01-01T00:00")))).toEqual([
      "2026-10-18T09:00",
      "2026-10-25T09:00",
      "2026-11-01T09:00",
    ]);
  });

  it("handles monthly by date, skipping months without that day", () => {
    const start = at("2027-01-31T18:00");
    const event = { startsAt: start, endsAt: at("2027-01-31T20:00"), rrule: buildRRule("monthly_date", start) };
    expect(starts(expandOccurrences(event, [], start, at("2027-06-01T00:00")))).toEqual([
      "2027-01-31T18:00",
      "2027-03-31T18:00",
      "2027-05-31T18:00",
    ]);
  });

  it("handles the nth and last weekday of the month", () => {
    const third = { ...weekly, rrule: "FREQ=MONTHLY;BYDAY=3SU" };
    expect(starts(expandOccurrences(third, [], SUNDAY, at("2027-01-01T00:00")))).toEqual([
      "2026-10-18T09:00",
      "2026-11-15T09:00",
      "2026-12-20T09:00",
    ]);
    const lastStart = at("2026-10-25T09:00");
    const last = { startsAt: lastStart, endsAt: at("2026-10-25T10:00"), rrule: "FREQ=MONTHLY;BYDAY=-1SU" };
    expect(starts(expandOccurrences(last, [], lastStart, at("2027-01-01T00:00")))).toEqual([
      "2026-10-25T09:00",
      "2026-11-29T09:00",
      "2026-12-27T09:00",
    ]);
  });

  it("applies cancellations and moves", () => {
    const exceptions = [
      { occurrenceStart: at("2026-10-25T09:00"), cancelled: true, newStart: null, newEnd: null, note: "Joint service" },
      {
        occurrenceStart: at("2026-11-01T09:00"),
        cancelled: false,
        newStart: at("2026-11-01T14:00"),
        newEnd: at("2026-11-01T15:30"),
        note: null,
      },
    ];
    const list = expandOccurrences(weekly, exceptions, at("2026-10-19T00:00"), at("2026-11-02T00:00"));
    expect(list.map((o) => [toLocalInput(o.start), o.cancelled, o.moved, o.note])).toEqual([
      ["2026-10-25T09:00", true, false, "Joint service"],
      ["2026-11-01T14:00", false, true, null],
    ]);
  });

  it("brings in a date moved into the window from outside it", () => {
    const moved = [
      { occurrenceStart: at("2026-11-08T09:00"), cancelled: false, newStart: at("2026-10-31T16:00"), newEnd: null, note: null },
    ];
    const list = expandOccurrences(weekly, moved, at("2026-10-31T00:00"), at("2026-11-01T00:00"));
    expect(starts(list)).toEqual(["2026-10-31T16:00"]);
  });

  it("treats a one-off event as a single occurrence", () => {
    const once = { startsAt: SUNDAY, endsAt: SUNDAY_END, rrule: null };
    expect(starts(expandOccurrences(once, [], at("2026-10-01T00:00"), at("2026-12-01T00:00")))).toEqual(["2026-10-18T09:00"]);
    expect(expandOccurrences(once, [], at("2026-10-19T00:00"), at("2026-12-01T00:00"))).toEqual([]);
  });

  it("checks whether a date belongs to the series", () => {
    expect(isOccurrence(weekly, at("2026-11-01T09:00"))).toBe(true);
    expect(isOccurrence(weekly, at("2026-11-01T10:00"))).toBe(false);
    expect(isOccurrence(weekly, at("2026-10-11T09:00"))).toBe(false);
  });
});
