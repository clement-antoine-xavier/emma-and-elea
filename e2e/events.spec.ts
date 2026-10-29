import { expect, test } from "@playwright/test";
import { deleteOrganizationBySlug, deleteUserByEmail } from "./db";
import { gotoHydrated, signUpAndCreateWorkspace } from "./helpers";

const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-events-${unique}@example.com`;
const password = "password12345";
const slug = `e2e-events-${unique}`;

test.afterAll(async () => {
  await deleteOrganizationBySlug(slug);
  await deleteUserByEmail(email);
});

test("an event can be added and archived from settings", async ({ page }) => {
  await signUpAndCreateWorkspace(page, {
    name: "Events Owner",
    email,
    password,
    businessName: "Events Bakery",
    slug,
    siteName: "Atelier Test",
    siteCode: "EVT",
  });

  await gotoHydrated(page, "/dashboard/settings?section=events");
  await expect(
    page.getByRole("heading", { name: "Local events" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Add an event" }).click();
  const form = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add event" }) });

  await form.getByLabel("Name").fill("School break");
  await form.getByLabel("Starts on").fill("2026-11-02");
  await form.getByLabel("Ends on").fill("2026-11-06");
  await form.getByLabel("Expected uplift").fill("15");
  await form.getByRole("button", { name: "Add event" }).click();

  await expect(page.getByText("School break")).toBeVisible();
  await expect(page.getByText("15 %")).toBeVisible();

  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Archived")).toBeVisible();
});
