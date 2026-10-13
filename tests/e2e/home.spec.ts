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
  await expect(page.getByRole("heading", { level: 1, name: "Welcome to UNZANAC" })).toBeVisible();
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
