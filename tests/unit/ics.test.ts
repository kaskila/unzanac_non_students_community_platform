import { describe, expect, it } from "vitest";
import { parseLocalDateTime } from "@/lib/dates";
import { buildIcs, escapeText, foldLine } from "@/lib/ics";

const at = (value: string) => parseLocalDateTime(value)!;

describe("buildIcs", () => {
  const ics = buildIcs(
    {
      uid: "evt1@unzanac",
      title: "Divine service; all welcome",
      description: "Bring a friend,\nand a hymn book",
      location: "UNZANAC church",
      url: "https://example.org/events/divine-service",
      startsAt: at("2026-10-18T09:00"),
      endsAt: at("2026-10-18T10:30"),
      rrule: "FREQ=WEEKLY;INTERVAL=1",
      updatedAt: new Date("2026-10-13T10:00:00Z"),
      exceptions: [
        { occurrenceStart: at("2026-10-25T09:00"), cancelled: true, newStart: null, newEnd: null, note: null },
        {
          occurrenceStart: at("2026-11-01T09:00"),
          cancelled: false,
          newStart: at("2026-11-01T14:00"),
          newEnd: null,
          note: "Afternoon this week",
        },
      ],
    },
    new Date("2026-10-13T12:00:00Z"),
  );
  const lines = ics.split("\r\n");

  it("is a CRLF calendar with a Lusaka time zone", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(lines).toContain("TZID:Africa/Lusaka");
    expect(lines).toContain("TZOFFSETTO:+0200");
  });

  it("writes local start and end times with the rule", () => {
    expect(lines).toContain("DTSTART;TZID=Africa/Lusaka:20261018T090000");
    expect(lines).toContain("DTEND;TZID=Africa/Lusaka:20261018T103000");
    expect(lines).toContain("RRULE:FREQ=WEEKLY;INTERVAL=1");
    expect(lines).toContain("SUMMARY:Divine service\\; all welcome");
    expect(lines).toContain("DESCRIPTION:Bring a friend\\,\\nand a hymn book");
  });

  it("excludes cancelled and moved dates, and adds the moved one back with the same length", () => {
    expect(lines).toContain("EXDATE;TZID=Africa/Lusaka:20261025T090000");
    expect(lines).toContain("EXDATE;TZID=Africa/Lusaka:20261101T090000");
    expect(lines).toContain("DTSTART;TZID=Africa/Lusaka:20261101T140000");
    expect(lines).toContain("DTEND;TZID=Africa/Lusaka:20261101T153000");
    expect(lines.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(2);
  });
});

describe("text helpers", () => {
  it("escapes special characters", () => {
    expect(escapeText("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });

  it("folds long lines at 75 octets without splitting characters", () => {
    const folded = foldLine(`DESCRIPTION:${"é".repeat(60)}`);
    for (const line of folded.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, "")).toBe(`DESCRIPTION:${"é".repeat(60)}`);
  });
});
