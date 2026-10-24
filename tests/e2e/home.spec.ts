import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Byte budgets from docs/decisions/0002-home-page-budget.md.
const BUDGET = {
  criticalPath: 50 * 1024, // HTML + CSS + images: what decides how fast the page appears on 3G
  firstVisit: 200 * 1024, // everything, including the framework JavaScript (cached for a year)
  repeatVisit: 20 * 1024, // second visit with a warm browser cache
};

test("home page shows the welcome, committees and YouTube link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Welcome to our congregation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Committees" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Secretariat" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Watch on YouTube" })).toHaveAttribute(
    "href",
    "https://www.youtube.com/@UNZANACMUSICDEPT",
  );
});

test("home page has no WCAG 2.2 AA violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("home page fits a 360px screen without sideways scrolling", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("home page stays within its byte budgets", async ({ page }) => {
  const first = await measureTransfer(page, () => page.goto("/", { waitUntil: "networkidle" }));
  const repeat = await measureTransfer(page, () => page.goto("/", { waitUntil: "networkidle" }));

  const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;
  console.log(
    `Home page: critical path ${kb(first.critical)}, first visit ${kb(first.total)}, repeat visit ${kb(repeat.total)}`,
  );
  expect(first.critical, "critical path (HTML + CSS + images)").toBeLessThanOrEqual(BUDGET.criticalPath);
  expect(first.total, "first visit").toBeLessThanOrEqual(BUDGET.firstVisit);
  expect(repeat.total, "repeat visit").toBeLessThanOrEqual(BUDGET.repeatVisit);
});

/** Bytes actually sent over the network (0 for responses served from the browser cache). */
async function measureTransfer(page: Page, navigate: () => Promise<unknown>) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  const types = new Map<string, string>();
  let total = 0;
  let critical = 0;
  cdp.on("Network.responseReceived", (e) => types.set(e.requestId, e.type));
  cdp.on("Network.loadingFinished", (e) => {
    total += e.encodedDataLength;
    if (["Document", "Stylesheet", "Image", "Font"].includes(types.get(e.requestId) ?? "")) {
      critical += e.encodedDataLength;
    }
  });
  await navigate();
  await cdp.detach();
  return { total, critical };
}

test("home photos change every few seconds, load one ahead, and can be paused", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  const slider = page.getByRole("region", { name: "Photos from the congregation" });
  const photos = slider.getByRole("img");
  await expect(photos).toHaveCount(1); // only the first photo comes with the page

  // Shortly before the 6-second mark the next photo is fetched, then it slides in.
  await page.clock.runFor(5_000);
  await expect(photos).toHaveCount(2);
  await page.clock.runFor(1_500);
  await expect(slider.getByRole("group", { name: "Photo 2 of 4" })).toBeInViewport({ ratio: 0.9 });

  // Pausing stops the slideshow (WCAG 2.2.2) and no further photos are downloaded.
  await slider.getByRole("button", { name: "Pause the slideshow" }).click();
  await expect(slider.getByRole("button", { name: "Play the slideshow" })).toBeVisible();
  await page.mouse.move(0, 0); // leave the slider, which on its own only pauses while hovered
  await page.clock.runFor(20_000);
  await expect(photos).toHaveCount(2);
});

test("visitors who ask for less motion get no slideshow", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 360, height: 740 } });
  const page = await context.newPage();
  await page.clock.install();
  await page.goto("/");
  const slider = page.getByRole("region", { name: "Photos from the congregation" });
  await expect(slider.getByRole("button", { name: "Play the slideshow" })).toBeVisible();
  await page.clock.runFor(20_000);
  await expect(slider.getByRole("img")).toHaveCount(1);
  await context.close();
});

test("Church finder shows a zoomable map of the church and opens directions in Maps", async ({ page }) => {
  // Keep the test offline: the map itself comes from Google.
  await page.route(/google\.com|gstatic\.com|googleapis\.com/, (route) => route.abort());
  await page.goto("/");
  await page.getByRole("link", { name: "Church finder" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Church finder" })).toBeVisible();
  await expect(page.locator("iframe")).toHaveAttribute("src", "https://www.google.com/maps?q=-15.390551,28.327913&z=17&output=embed");
  await expect(page.getByRole("link", { name: "Get directions" })).toHaveAttribute(
    "href",
    "https://www.google.com/maps/dir/?api=1&destination=-15.390551,28.327913",
  );
  await expect(page.getByRole("link", { name: "Open in Google Maps" })).toHaveAttribute("href", "https://maps.app.goo.gl/x1rju4fHfrWR29yJ9");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).exclude("iframe").analyze();
  expect(results.violations).toEqual([]);
});

test("welcome section with the Rector, and the footer's social and policy links", async ({ page }) => {
  await page.goto("/");
  const welcome = page.getByRole("region", { name: "Welcome to our congregation" });
  await expect(welcome.getByRole("img", { name: "Shephard Liswaniso, Rector of the UNZA congregation" })).toBeVisible();
  await expect(welcome.getByRole("heading", { level: 2, name: "Welcome message" })).toBeVisible();
  await expect(welcome).toContainText("Warm greetings in the name of our Lord Jesus Christ");
  await expect(welcome).toContainText("Rector: Shephard Liswaniso");

  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "WhatsApp group" })).toHaveAttribute("href", "https://chat.whatsapp.com/JgRvaIKqk5C30pzl9ImhAE");
  await expect(footer.getByRole("link", { name: "YouTube" })).toHaveAttribute("href", "https://www.youtube.com/@UNZANACMUSICDEPT");
  await footer.getByRole("link", { name: "Terms of use" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Terms of use" })).toBeVisible();
});
