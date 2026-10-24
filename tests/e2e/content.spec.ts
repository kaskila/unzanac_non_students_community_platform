import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { toLocalInput } from "../../src/lib/dates";
import { acceptInvite, alertMessage, enrolTwoFactor, gotoFresh, inviteAdmin, signIn } from "./helpers";

// M2 exit criteria (docs/PLAN.md §11): journeys 1 and 2, plus accessibility on every public page.
// A register officer can manage content and site content. Using one (not an owner) keeps the
// "first owner" bootstrap in admin.spec.ts independent of this file.
const ADMIN = { email: "officer@example.org", name: "Content Officer", password: "officer-password-123" };
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test.describe.configure({ mode: "serial" });

let admin: Page;

test.beforeAll(async ({ browser }) => {
  // Its own client address, so this file's sign-in doesn't use up admin.spec.ts's sign-in rate limit
  // (5 per minute per address, src/server/auth.ts) when both run in parallel.
  admin = await (await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.20" } })).newPage();
  await acceptInvite(admin, inviteAdmin(ADMIN.email, ADMIN.name, "register_officer"), ADMIN.name, ADMIN.password);
  await signIn(admin, ADMIN.email, ADMIN.password);
  await enrolTwoFactor(admin, ADMIN.password);
  await expect(admin.getByRole("heading", { name: `Welcome, ${ADMIN.name}` })).toBeVisible();
});

test.afterAll(async () => {
  await admin.context().close();
});

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations).toEqual([]);
}

test("journey 1: an admin publishes an announcement and it appears on the home page", async ({ page }) => {
  const adminMenu = admin.getByRole("navigation", { name: "Admin menu" });
  await adminMenu.getByRole("link", { name: "Announcements" }).click();
  await expect(admin.getByRole("heading", { level: 1, name: "Announcements" })).toBeVisible();
  // One row of tabs: the current one is marked, and the tab row (not the page) scrolls on a phone.
  await expect(adminMenu.getByRole("link", { name: "Announcements" })).toHaveAttribute("aria-current", "page");
  await expect(adminMenu.getByRole("list", { name: "Website" })).toBeAttached();
  expect(await admin.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await admin.getByRole("link", { name: "New announcement" }).click();
  await expect(admin.getByRole("heading", { level: 1, name: "New announcement" })).toBeVisible();

  // Validation errors are listed at the top and the typed text is kept.
  await admin.getByLabel("Title").fill("Youth day: sports & fellowship");
  await admin.getByRole("button", { name: "Publish" }).click();
  await expect(alertMessage(admin)).toContainText("Text: This is required.");
  await expect(admin.getByLabel("Title")).toHaveValue("Youth day: sports & fellowship");
  await expectNoAxeViolations(admin);

  await admin.getByLabel("Text", { exact: true }).fill("All young people are invited.\n\n- Football at **14:00**\n- Tea afterwards");
  await admin.getByLabel("Category").selectOption("YOUTH");
  await admin.getByRole("button", { name: "Publish" }).click();
  await expect(admin).toHaveURL(/\/admin\/announcements$/);
  await expect(admin.getByRole("listitem").filter({ hasText: "Youth day: sports & fellowship" })).toContainText("Live");

  // A draft must not appear publicly.
  await admin.getByRole("link", { name: "New announcement" }).click();
  await expect(admin.getByRole("heading", { level: 1, name: "New announcement" })).toBeVisible();
  await admin.getByLabel("Title").fill("Draft notice");
  await admin.getByLabel("Text", { exact: true }).fill("Not ready yet.");
  await admin.getByRole("button", { name: "Save draft" }).click();
  await expect(admin).toHaveURL(/\/admin\/announcements$/);

  const section = page.getByRole("region", { name: "Announcements" });
  await gotoFresh(page, "/", () => expect(section).toContainText("Youth day", { timeout: 1000 }));
  await expect(section.getByRole("link", { name: "Youth day: sports & fellowship", exact: true })).toBeVisible();
  await expect(section).not.toContainText("Draft notice");
  await expect(section.getByRole("link", { name: /Share on WhatsApp/ })).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=/);

  await section.getByRole("link", { name: "Youth day: sports & fellowship", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Youth day: sports & fellowship" })).toBeVisible();
  await expect(page.locator(".prose strong")).toHaveText("14:00");
  await expect(page.getByText("Youth ·")).toBeVisible();
  await expectNoAxeViolations(page);
});

test("journey 2: a weekly service feeds the next service card, the schedule and the calendar file", async ({ page }) => {
  // Tomorrow at 09:00 Lusaka time, so the first date is always in the future.
  const start = new Date(Date.now() + 86_400_000);
  const day = toLocalInput(start).slice(0, 10);

  await admin.goto("/admin/events/new");
  await admin.getByLabel("Title").fill("Divine service");
  await admin.getByLabel("Starts (first date)").fill(`${day}T09:00`);
  await admin.getByLabel("Ends", { exact: true }).fill(`${day}T08:00`);
  await admin.getByLabel("Repeats").selectOption("weekly");
  await admin.getByLabel("Venue").fill("UNZANAC church");
  await admin.getByLabel("This is a divine service").check();
  await admin.getByLabel("Show in the regular schedule").check();
  await admin.getByRole("button", { name: "Publish" }).click();
  await expect(alertMessage(admin)).toContainText("Ends: The end must be after the start.");

  await admin.getByLabel("Ends", { exact: true }).fill(`${day}T10:30`);
  await admin.getByRole("button", { name: "Publish" }).click();
  await expect(admin).toHaveURL(/\/admin\/events\/[a-z0-9]+$/);
  await expect(admin.getByRole("heading", { name: "Upcoming dates" })).toBeVisible();

  // Cancel the second date with a note.
  const second = admin.getByTestId("event-date").nth(1);
  await second.getByText("Cancel or move").click();
  await second.getByLabel("Note for visitors").fill("Joint service at Lusaka Central");
  await second.getByRole("button", { name: "Cancel this date" }).click();
  await expect(admin.getByTestId("event-date").nth(1)).toContainText("Cancelled");
  await expectNoAxeViolations(admin);

  await page.goto("/");
  const card = page.getByTestId("next-service");
  await expect(card.getByRole("link", { name: "Divine service" })).toBeVisible();
  await expect(card).toContainText("UNZANAC church");
  const weekday = new Intl.DateTimeFormat("en-ZM", { weekday: "long", timeZone: "Africa/Lusaka" }).format(start);
  await expect(page.getByRole("region", { name: "Regular schedule" })).toContainText(`Every ${weekday}`);

  await page.goto("/events");
  await expect(page.getByText("Joint service at Lusaka Central")).toBeVisible();
  await expect(page.getByText("Cancelled").first()).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByRole("link", { name: "Divine service" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Divine service" })).toBeVisible();
  await expectNoAxeViolations(page);
  const icsHref = await page.getByRole("link", { name: "Add to calendar" }).getAttribute("href");
  const response = await page.request.get(icsHref!);
  expect(response.headers()["content-type"]).toContain("text/calendar");
  expect(response.headers()["content-disposition"]).toContain("attachment");
  const ics = await response.text();
  expect(ics).toContain("SUMMARY:Divine service");
  expect(ics).toContain("RRULE:FREQ=WEEKLY;INTERVAL=1");
  expect(ics).toContain(`DTSTART;TZID=Africa/Lusaka:${day.replace(/-/g, "")}T090000`);
  expect(ics).toMatch(/EXDATE;TZID=Africa\/Lusaka:\d{8}T090000/);
});

test("site content edits appear on the public site", async ({ page }) => {
  await admin.goto("/admin/content");
  await expect(admin.getByRole("heading", { level: 1, name: "Site content" })).toBeVisible();
  await expectNoAxeViolations(admin);
  const contacts = admin.getByRole("region", { name: "Contacts" });
  await contacts.getByLabel("Role").first().fill("Rector");
  await contacts.getByLabel("Name").first().fill("Pr. Mwila");
  await contacts.getByLabel("Phone").first().fill("0971 234 567");
  await contacts.getByRole("button", { name: "Save" }).click();
  await expect(contacts.getByRole("status")).toHaveText("Saved.");

  const privacy = admin.getByRole("region", { name: "Privacy notice" });
  await privacy.getByLabel("Notice").fill("We collect only what the congregation needs.");
  await privacy.getByRole("button", { name: "Publish new version" }).click();
  await expect(privacy.getByRole("status")).toHaveText("Published.");

  const contactsSection = page.getByRole("region", { name: "Contacts" });
  await gotoFresh(page, "/", () => expect(contactsSection).toContainText("Pr. Mwila", { timeout: 1000 }));
  await expect(contactsSection.getByRole("link", { name: "+260 97 123 4567" })).toHaveAttribute("href", "tel:+260971234567");
  await expect(contactsSection.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", "https://wa.me/260971234567");

  await page.getByRole("link", { name: "Privacy notice" }).click();
  await expect(page.getByText("Version 1, published")).toBeVisible();
  await expect(page.getByText("We collect only what the congregation needs.")).toBeVisible();
});

test("the menu, search box and current-page mark work", async ({ page }) => {
  await page.goto("/committees");
  const menu = page.getByRole("navigation", { name: "Main menu" });
  // 360px: the links sit behind "Menu".
  await menu.getByText("Menu").click();
  await expect(menu.getByRole("link", { name: "Committees" })).toHaveAttribute("aria-current", "page");
  await menu.getByRole("link", { name: "Activities" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Activities" })).toBeVisible();

  await page.getByRole("searchbox", { name: "Search" }).fill("youth day");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/search\?q=youth\+day$/);
  await expect(page.getByRole("status")).toContainText('1 result for "youth day"');
  await expect(page.getByRole("link", { name: "Youth day: sports & fellowship" })).toBeVisible();

  await page.getByRole("link", { name: "Contact" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeVisible();
  await expect(page.getByText("Pr. Mwila").first()).toBeVisible();
});

// 1×1 PNG: enough for the server to detect, resize and convert.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("home photos: uploaded, resized, and only the first one downloads with the page", async ({ page }) => {
  await admin.goto("/admin/home-photos");
  await expect(admin.getByRole("heading", { level: 1, name: "Home photos" })).toBeVisible();
  await expectNoAxeViolations(admin);

  // A description is required, and the file must really be a photo.
  await admin.getByLabel("Photo", { exact: true }).setInputFiles({ name: "group.png", mimeType: "image/png", buffer: PNG });
  await admin.getByRole("button", { name: "Upload photo" }).click();
  await expect(alertMessage(admin)).toContainText("Describe the photo first");
  await admin.getByLabel("Description", { exact: true }).first().fill("Not a photo");
  await admin.getByLabel("Photo", { exact: true }).setInputFiles({ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("%PDF-1.4 not an image") });
  await admin.getByRole("button", { name: "Upload photo" }).click();
  await expect(alertMessage(admin)).toContainText("Use a JPG, PNG or WebP photo.");

  for (const alt of ["Members after the youth service", "The choir on Easter Sunday"]) {
    await admin.getByLabel("Description", { exact: true }).first().fill(alt);
    await admin.getByLabel("Photo", { exact: true }).setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: PNG });
    await admin.getByRole("button", { name: "Upload photo" }).click();
    await expect(admin.getByRole("status").filter({ hasText: "Photo added." })).toBeVisible();
  }
  await expect(admin.getByTestId("home-photo")).toHaveCount(2);

  const photoRequests: string[] = [];
  page.on("request", (r) => r.url().includes("/images/hero/") && photoRequests.push(r.url()));
  await gotoFresh(page, "/", () =>
    expect(page.getByRole("img", { name: "Members after the youth service" })).toBeVisible({ timeout: 1000 }),
  );
  await expect(page.getByRole("heading", { level: 1, name: "Welcome to UNZANAC" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(new Set(photoRequests.map((u) => u.split("/")[5])).size, "only the first photo loads").toBe(1);
  await expectNoAxeViolations(page);

  const response = await page.request.get(photoRequests[0]);
  expect(response.headers()["content-type"]).toBe("image/webp");
  expect(response.headers()["cache-control"]).toContain("immutable");

  await page.getByRole("button", { name: "Next photo" }).click();
  await expect(page.getByRole("img", { name: "The choir on Easter Sunday" })).toBeAttached();

  // Clean up so other spec files see the home page without photos.
  for (let i = 0; i < 2; i++) {
    await admin.getByRole("button", { name: /^Delete photo/ }).first().click();
    await expect(admin.getByTestId("home-photo")).toHaveCount(1 - i);
  }
});

test("every public page is accessible and fits a 360px screen", async ({ page }) => {
  for (const path of [
    "/",
    "/announcements",
    "/events",
    "/committees",
    "/committees/music",
    "/visit",
    "/privacy",
    "/about",
    "/contact",
    "/search?q=youth",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0);
    await expectNoAxeViolations(page);
  }
});
