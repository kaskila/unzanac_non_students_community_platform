import { createHash, randomBytes } from "node:crypto";

/** A 32-byte random token for one-time links. Only the hash is stored; the token goes in the link. */
export function generateToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Absolute app URL for links shown to admins. BETTER_AUTH_URL is the app's own origin. */
export function appUrl(path: string): string {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}
