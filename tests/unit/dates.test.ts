import { describe, expect, it } from "vitest";
import { LUSAKA_OFFSET_MINUTES, localDateKey, parseLocalDateTime, TIME_ZONE, toLocalInput } from "@/lib/dates";

describe("Lusaka dates", () => {
  it("matches the time zone database: UTC+2 all year, no daylight saving", () => {
    for (const month of [0, 3, 6, 9]) {
      const date = new Date(Date.UTC(2026, month, 15, 12));
      const lusaka = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", hourCycle: "h23" }).format(date);
      expect(Number(lusaka)).toBe(12 + LUSAKA_OFFSET_MINUTES / 60);
    }
  });

  it("parses form values as Lusaka time", () => {
    expect(parseLocalDateTime("2026-10-18T09:00")?.toISOString()).toBe("2026-10-18T07:00:00.000Z");
    expect(parseLocalDateTime("2026-10-18T01:30")?.toISOString()).toBe("2026-10-17T23:30:00.000Z");
  });

  it("rejects malformed and impossible dates", () => {
    expect(parseLocalDateTime("")).toBeNull();
    expect(parseLocalDateTime("18/10/2026 09:00")).toBeNull();
    expect(parseLocalDateTime("2026-02-31T09:00")).toBeNull();
    expect(parseLocalDateTime("2026-10-18T24:00")).toBeNull();
  });

  it("round-trips to form values and calendar dates", () => {
    const date = new Date("2026-10-17T23:30:00Z");
    expect(toLocalInput(date)).toBe("2026-10-18T01:30");
    expect(localDateKey(date)).toBe("2026-10-18");
    expect(toLocalInput(null)).toBe("");
  });
});
