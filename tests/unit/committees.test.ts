import { describe, expect, it } from "vitest";
import { COMMITTEES } from "@/lib/committees";

describe("committees seed", () => {
  it("lists the nine committees", () => {
    expect(COMMITTEES).toHaveLength(9);
  });

  it("uses unique, URL-safe slugs", () => {
    const slugs = COMMITTEES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});
