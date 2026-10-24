import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { acceptInvite, alertMessage, enrolTwoFactor, inviteOwner, signIn, totp } from "./helpers";

const OWNER = { email: "owner@example.org", name: "Test Owner", password: "owner-password-123" };
const EDITOR = { email: "editor@example.org", name: "Test Editor", password: "editor-password-123" };

// M1 exit criteria (docs/PLAN.md §11): an owner invites an editor; the editor is blocked from the register.
test.describe.configure({ mode: "serial" });

test("visitors without a session are sent to the admin sign-in", async ({ page }) => {
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("an invite link works once and unknown links are rejected", async ({ page }) => {
  await page.goto("/admin/invite/not-a-real-token");
  await expect(alertMessage(page)).toContainText("expired or has already been used");
});

test("owner and editor: invite, two-step sign-in, roles and deactivation", async ({ browser }) => {
  // A long flow (two invites, two 2FA enrolments, three sign-ins); allow for a busy CI machine.
  test.setTimeout(60_000);
  const ownerPage = await (await browser.newContext()).newPage();
  const editorPage = await (await browser.newContext()).newPage();
  let ownerKey = "";

  await test.step("owner accepts the bootstrap invite and enrols 2FA", async () => {
    const link = inviteOwner(OWNER.email, OWNER.name);
    await acceptInvite(ownerPage, link, OWNER.name, OWNER.password);

    // The same link can't be used twice.
    const reuse = await ownerPage.context().newPage();
    await reuse.goto(link);
    await expect(alertMessage(reuse)).toContainText("expired or has already been used");
    await reuse.close();

    await signIn(ownerPage, OWNER.email, OWNER.password);
    ownerKey = await enrolTwoFactor(ownerPage, OWNER.password);
    await expect(ownerPage.getByRole("heading", { name: `Welcome, ${OWNER.name}` })).toBeVisible();
  });

  let editorLink = "";
  await test.step("owner creates an editor invite", async () => {
    await ownerPage.getByRole("link", { name: "Admin users" }).click();
    const inviteForm = ownerPage.getByRole("region", { name: "Invite an admin" });
    await inviteForm.getByLabel("Email", { exact: true }).fill(EDITOR.email);
    await inviteForm.getByLabel("Name", { exact: true }).fill(EDITOR.name);
    await inviteForm.getByLabel("Role", { exact: true }).selectOption("editor");
    await inviteForm.getByRole("button", { name: "Create invite link" }).click();
    editorLink = await inviteForm.getByTestId("generated-link").inputValue();
    expect(editorLink).toMatch(/\/admin\/invite\/[A-Za-z0-9_-]{43}$/);
    await expect(ownerPage.getByText(`Invite: ${EDITOR.email}`)).toBeVisible();

    const results = await new AxeBuilder({ page: ownerPage })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  await test.step("editor accepts, enrols 2FA and is blocked from the register", async () => {
    await acceptInvite(editorPage, editorLink, EDITOR.name, EDITOR.password);
    await signIn(editorPage, EDITOR.email, EDITOR.password);
    await enrolTwoFactor(editorPage, EDITOR.password);
    await expect(editorPage.getByRole("heading", { name: `Welcome, ${EDITOR.name}` })).toBeVisible();

    const nav = editorPage.getByRole("navigation", { name: "Admin menu" });
    await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Register" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Admin users" })).toHaveCount(0);

    for (const path of ["/admin/register", "/admin/users", "/admin/audit"]) {
      await editorPage.goto(path);
      await expect(editorPage.getByRole("heading", { name: "Not allowed" })).toBeVisible();
    }
  });

  await test.step("owner sees the editor, the audit trail, and deactivates them", async () => {
    await ownerPage.goto("/admin/audit");
    await expect(ownerPage.getByRole("cell", { name: "admin.invite_accept" }).first()).toBeVisible();
    await expect(ownerPage.getByRole("cell", { name: "auth.sign_in", exact: true }).first()).toBeVisible();

    await ownerPage.goto("/admin/users");
    const editorCard = ownerPage.getByRole("listitem").filter({ hasText: EDITOR.email });
    await expect(editorCard.getByText("On", { exact: true })).toBeVisible();
    await editorCard.getByRole("button", { name: `Deactivate ${EDITOR.name}` }).click();
    await expect(editorCard.getByText("Deactivated")).toBeVisible();

    // The editor's session is gone: the next request lands on the sign-in page.
    await editorPage.goto("/admin");
    await expect(editorPage).toHaveURL(/\/admin\/login$/);
    await signIn(editorPage, EDITOR.email, EDITOR.password);
    await expect(alertMessage(editorPage)).toContainText("deactivated");
  });

  await test.step("owner signs in again with password and authenticator code", async () => {
    const page = await (await browser.newContext()).newPage();
    await page.goto("/admin/login");
    await signIn(page, OWNER.email, OWNER.password);
    await expect(page).toHaveURL(/\/admin\/login\/verify$/);
    await page.getByLabel("6-digit code").fill("000000");
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(alertMessage(page)).toContainText("didn't work");

    await page.getByLabel("6-digit code").fill(totp(ownerKey));
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByRole("heading", { name: `Welcome, ${OWNER.name}` })).toBeVisible();
  });
});

test("a wrong password is rejected with a clear message", async ({ page }) => {
  await page.goto("/admin/login");
  await signIn(page, OWNER.email, "not-the-password");
  await expect(alertMessage(page)).toContainText("Email or password is incorrect");
});


test("a username instead of an email gets a clear hint", async ({ page }) => {
  await page.goto("/admin/login");
  await signIn(page, "kasikila", "some-password-123");
  await expect(alertMessage(page)).toContainText("full email address");
});
