import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Budget from docs/PLAN.md §9: the home page must transfer no more than 150 KB.
const HOME_BUDGET_BYTES = 150 * 1024;

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

test("home page stays within the 150 KB transfer budget", async ({ page }) => {
  const responses: Promise<number>[] = [];
  page.on("requestfinished", (request) => {
    responses.push(request.sizes().then((s) => s.responseBodySize + s.responseHeadersSize));
  });
  await page.goto("/", { waitUntil: "networkidle" });
  const total = (await Promise.all(responses)).reduce((sum, bytes) => sum + bytes, 0);
  console.log(`Home page transferred ${(total / 1024).toFixed(1)} KB across ${responses.length} requests`);
  expect(total).toBeLessThanOrEqual(HOME_BUDGET_BYTES);
});
