import { describe, expect, it } from "vitest";
import { appUrl, generateToken, hashToken } from "@/server/tokens";

describe("one-time link tokens", () => {
  it("generates long, URL-safe, unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateToken().token));
    expect(tokens.size).toBe(100);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("stores only a SHA-256 hash that matches the token", () => {
    const { token, tokenHash } = generateToken();
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).not.toContain(token);
    expect(hashToken(token)).toBe(tokenHash);
  });

  it("builds links from the app origin", () => {
    expect(appUrl("/admin/invite/abc")).toMatch(/^https?:\/\/[^/]+\/admin\/invite\/abc$/);
  });
});
