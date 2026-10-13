import { execSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { e2eEnv } from "./env";

/** RFC 6238 TOTP from a Base32 key, the same calculation an authenticator app does. */
export function totp(base32Key: string, now = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of base32Key.replace(/=+$/, "").toUpperCase()) {
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  }
  const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / 30)));
  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

/** Run the bootstrap script and return the owner invite link it prints. */
export function inviteOwner(email: string, name: string): string {
  const output = execSync(`npx tsx scripts/invite-owner.ts ${email} "${name}"`, {
    env: { ...process.env, ...e2eEnv },
    encoding: "utf8",
  });
  const link = output.match(/https?:\/\/\S+\/admin\/invite\/\S+/)?.[0];
  if (!link) throw new Error(`No invite link in output:\n${output}`);
  return link;
}

/** Invite link for an admin of any role (test-only script, see invite-admin.ts). */
export function inviteAdmin(email: string, name: string, role: "owner" | "register_officer" | "editor"): string {
  const output = execSync(`npx tsx tests/e2e/invite-admin.ts ${email} "${name}" ${role}`, {
    env: { ...process.env, ...e2eEnv },
    encoding: "utf8",
  });
  const link = output.match(/https?:\/\/\S+\/admin\/invite\/\S+/)?.[0];
  if (!link) throw new Error(`No invite link in output:
${output}`);
  return link;
}

export async function acceptInvite(page: Page, link: string, name: string, password: string) {
  await page.goto(link);
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Password (at least 12 characters)").fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/admin\/login\?ready=1$/);
}

export async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** Complete first-time 2FA enrolment; returns the Base32 key for later sign-ins. */
export async function enrolTwoFactor(page: Page, password: string): Promise<string> {
  await expect(page).toHaveURL(/\/admin\/setup-2fa$/);
  await page.getByLabel("Confirm your password").fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
  const key = (await page.getByTestId("totp-key").textContent())?.trim() ?? "";
  expect(key).toMatch(/^[A-Z2-7]+=*$/);
  await page.getByLabel("Code from the app").fill(totp(key));
  await page.getByRole("button", { name: "Turn on two-step sign-in" }).click();
  return key;
}

/** Our own alert messages (excludes Next.js's hidden route announcer, which also has role="alert"). */
export function alertMessage(page: Page) {
  return page.locator('[role="alert"]:not(#__next-route-announcer__)');
}
