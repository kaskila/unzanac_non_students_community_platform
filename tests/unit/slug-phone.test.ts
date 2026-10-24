import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { slugify, uniqueSlug } from "@/lib/slug";

describe("slugs", () => {
  it("makes URL-safe slugs", () => {
    expect(slugify("Youth Day: Sports & Fellowship!")).toBe("youth-day-sports-and-fellowship");
    expect(slugify("Réunion 2026")).toBe("reunion-2026");
    expect(slugify("!!!")).toBe("item");
    expect(slugify("a".repeat(80))).toHaveLength(60);
  });

  it("adds a number when a slug is taken", async () => {
    const taken = new Set(["youth-day", "youth-day-2"]);
    expect(await uniqueSlug("Youth day", async (s) => taken.has(s))).toBe("youth-day-3");
  });
});

describe("phones", () => {
  it("normalises Zambian numbers to E.164", () => {
    for (const input of ["0971 234 567", "+260 97 1234567", "260971234567", "(097) 123-4567"]) {
      expect(normalizePhone(input)).toBe("+260971234567");
    }
    expect(normalizePhone("+27 82 123 4567")).toBe("+27821234567");
  });

  it("rejects incomplete or invalid numbers", () => {
    for (const input of ["", "097123", "0971234567890", "+260 97 123", "abc"]) {
      expect(normalizePhone(input)).toBeNull();
    }
  });

  it("formats Zambian numbers for display", () => {
    expect(formatPhone("+260971234567")).toBe("+260 97 123 4567");
  });
});
