import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONTRAST_PAIRS, PALETTE, contrastRatio } from "@/lib/brand";

describe("brand palette", () => {
  it("keeps the brand Azure as #5793c9", () => {
    expect(PALETTE["azure-500"]).toBe("#5793c9");
  });

  it("matches the @theme tokens in globals.css", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const tokens = Object.fromEntries(
      [...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map(([, name, hex]) => [name, hex.toLowerCase()]),
    );
    expect(tokens).toEqual(PALETTE);
  });

  it.each(CONTRAST_PAIRS)("$fg on $bg meets $min:1 ($use)", ({ fg, bg, min }) => {
    expect(contrastRatio(PALETTE[fg], PALETTE[bg])).toBeGreaterThanOrEqual(min);
  });

  it("calculates WCAG contrast correctly", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#5793c9", "#ffffff")).toBeCloseTo(3.27, 2);
  });
});
