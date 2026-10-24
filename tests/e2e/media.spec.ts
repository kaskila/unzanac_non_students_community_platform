import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { E2E_BASE_URL } from "./env";
import { acceptInvite, alertMessage, enrolTwoFactor, gotoFresh, inviteAdmin, signIn } from "./helpers";

// M2b exit criteria (docs/PLAN.md §11): journeys 7 (videos) and 8 (resources).
const EDITOR = { email: "media@example.org", name: "Media Editor", password: "media-password-123" };
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const VIDEO_ID = "dQw4w9WgXcQ";

// A tiny but real PDF and PNG: the server decides the type from these bytes, not the name.
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe.configure({ mode: "serial" });

let admin: Page;

test.beforeAll(async ({ browser }) => {
  // Own client address: sign-in rate limits are per address (see content.spec.ts).
  admin = await (await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.30" } })).newPage();
  await acceptInvite(admin, inviteAdmin(EDITOR.email, EDITOR.name, "editor"), EDITOR.name, EDITOR.password);
  await signIn(admin, EDITOR.email, EDITOR.password);
  await enrolTwoFactor(admin, EDITOR.password);
  await expect(admin.getByRole("heading", { name: `Welcome, ${EDITOR.name}` })).toBeVisible();
});

test.afterAll(async () => {
  await admin.context().close();
});

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations).toEqual([]);
}

test("journey 7: an editor adds a YouTube video; the Watch page loads no YouTube code until play", async ({ page }) => {
  // Calls YouTube for the title (up to 5 s) and reloads the home page until it is fresh.
  test.setTimeout(60_000);
  await admin.goto("/admin/media");
  await expect(admin.getByRole("heading", { level: 1, name: "Media" })).toBeVisible();
  await admin.getByLabel("Video link").fill("https://example.org/not-a-video");
  await admin.getByRole("button", { name: "Add video" }).click();
  await expect(alertMessage(admin)).toContainText("Paste a YouTube or Facebook video link.");
  await expectNoAxeViolations(admin);

  await admin.getByLabel("Video link").fill(`https://youtu.be/${VIDEO_ID}?si=shared`);
  await admin.getByRole("button", { name: "Add video" }).click();
  await expect(admin).toHaveURL(/\/admin\/media\/[a-z0-9]+$/, { timeout: 15_000 });
  // The title comes from YouTube when it answers; set our own either way.
  await admin.getByLabel("Title").fill("Choir: Abide with me");
  await admin.getByLabel("Category").selectOption("CHOIR_MUSIC");
  await admin.getByLabel("Feature on the home page").check();
  await admin.getByRole("button", { name: "Publish" }).click();
  await expect(admin.getByRole("status")).toHaveText("Saved.");

  // Visitors: record every request to YouTube's domains, and block them (tests run offline-safe).
  const youtubeRequests: string[] = [];
  await page.route(/youtube(-nocookie)?\.com|ytimg\.com|googlevideo\.com/, (route) => {
    youtubeRequests.push(route.request().url());
    return route.abort();
  });

  await page.goto("/watch");
  await expect(page.getByRole("heading", { level: 2, name: "Choir & music" })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.getByRole("link", { name: "Choir: Abide with me" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Choir: Abide with me" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Watch in the YouTube app" })).toHaveAttribute("href", `https://youtu.be/${VIDEO_ID}`);
  await expectNoAxeViolations(page);

  // Only the ~15 KB thumbnail may have been requested so far: no player, no YouTube scripts.
  expect(youtubeRequests.filter((url) => !url.includes("i.ytimg.com/vi/"))).toEqual([]);
  await expect(page.locator("iframe")).toHaveCount(0);

  await page.getByRole("button", { name: "Play: Choir: Abide with me" }).click();
  await expect(page.locator("iframe")).toHaveAttribute("src", `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`);

  // The featured video is on the home page. Other spec files load "/" in parallel, so a render that
  // started before the publish may land just after it; reload until the fresh page is served.
  await gotoFresh(page, "/", () =>
    expect(page.getByRole("region", { name: "Watch and listen" })).toContainText("Choir: Abide with me", { timeout: 1000 }),
  );
});

async function createResource(title: string, options: { unlisted?: boolean } = {}) {
  await admin.goto("/admin/resources/new");
  await expect(admin.getByRole("heading", { level: 1, name: "New resource" })).toBeVisible();
  await admin.getByLabel("Title").fill(title);
  await admin.getByLabel("Category", { exact: true }).selectOption("DIVINE_SERVICE_HYMNS");
  if (options.unlisted) await admin.getByLabel("Visibility").selectOption("UNLISTED");
  await admin.getByRole("button", { name: "Save and continue to upload" }).click();
  await expect(admin.getByRole("heading", { level: 1, name: title })).toBeVisible();
}

async function upload(name: string, mimeType: string, buffer: Buffer) {
  await admin.getByLabel(/Choose a file|Replace the file/).setInputFiles({ name, mimeType, buffer });
  await admin.getByRole("button", { name: /^Upload/ }).click();
}

test("journey 8: an editor uploads a PDF; visitors see type and size and download it", async ({ page }) => {
  await createResource("Hymn sheet October");
  await expectNoAxeViolations(admin);
  await upload("hymns.pdf", "application/pdf", PDF);
  await expect(admin.getByRole("status").filter({ hasText: "Uploaded." })).toBeVisible();
  await expect(admin.getByText("hymns.pdf · PDF · 1 KB")).toBeVisible();
  await admin.getByRole("button", { name: "Publish" }).click();
  await expect(admin.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();

  await page.goto("/resources");
  await expect(page.getByRole("link", { name: "Hymn sheet October" })).toBeVisible();
  await expect(page.getByText("PDF · 1 KB ·")).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByRole("link", { name: "Hymn sheet October" }).click();
  const download = page.getByRole("link", { name: "Download (PDF · 1 KB)" });
  await expect(download).toBeVisible();
  await expectNoAxeViolations(page);

  const response = await page.request.get(`${E2E_BASE_URL}${await download.getAttribute("href")}`);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-disposition"]).toContain('attachment; filename="hymns.pdf"');
  expect((await response.body()).subarray(0, 5).toString()).toBe("%PDF-");

  await admin.reload();
  await expect(admin.getByTestId("download-count")).toHaveText("1 download");
});

test("an unlisted resource is missing from lists but opens by its link", async ({ page }) => {
  await createResource("Choir roster", { unlisted: true });
  await upload("roster.png", "image/png", PNG);
  await expect(admin.getByRole("status").filter({ hasText: "Uploaded." })).toBeVisible();
  await admin.getByRole("button", { name: "Publish" }).click();
  await expect(admin.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
  const href = await admin.getByRole("link", { name: "View on the site" }).getAttribute("href");

  await page.goto("/resources");
  await expect(page.getByRole("link", { name: "Hymn sheet October" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Choir roster" })).toHaveCount(0);
  await page.goto(href!);
  await expect(page.getByRole("heading", { level: 1, name: "Choir roster" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download (PNG · 1 KB)" })).toBeVisible();
});

test("an HTML file is rejected, whatever its name", async () => {
  await createResource("Not a PDF");
  await upload("notes.pdf", "application/pdf", Buffer.from("<!doctype html><script>alert(1)</script>"));
  await expect(alertMessage(admin)).toContainText("This type of file isn't allowed.");
  await expect(admin.getByText("No file uploaded yet.")).toBeVisible();
  await expect(admin.getByRole("button", { name: "Publish" })).toHaveCount(0);
});

test("the daily job requires its secret", async ({ request }) => {
  expect((await request.get("/api/cron/daily")).status()).toBe(401);
  const response = await request.get("/api/cron/daily", { headers: { Authorization: "Bearer e2e-cron-secret" } });
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ videosImported: "no_channel_id", purged: { materials: 0 } });
});
