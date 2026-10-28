import { expect, test } from "@playwright/test";
import { deleteOrganizationBySlug, deleteUserByEmail } from "./db";
import { gotoHydrated } from "./helpers";

const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-settings-${unique}@example.com`;
const password = "password12345";
const slug = `e2e-settings-${unique}`;

test.afterAll(async () => {
  await deleteOrganizationBySlug(slug);
  await deleteUserByEmail(email);
});

test("onboarding creates the first site and settings manage the reference data", async ({
  page,
}) => {
  await gotoHydrated(page, "/sign-up");
  await page.getByLabel("Name").fill("Settings Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByLabel("Business name").fill("Settings Bakery");
  await page.getByLabel("Workspace address").fill(slug);
  await page.getByLabel("Site name").fill("Atelier Test");
  await page.getByLabel("Site code").fill("TST");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // The first site is visible and editable.
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings$/);
  await page.getByRole("link", { name: "Sites", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings\?section=sites$/);
  await expect(page.getByText("Atelier Test")).toBeVisible();
  await expect(page.getByText("TST", { exact: true })).toBeVisible();

  // Create a second site.
  await page.getByRole("button", { name: "Add a site" }).click();
  const siteForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add site" }) });
  await siteForm.getByLabel("Site name").fill("Boutique Test");
  await siteForm.getByLabel("Code").fill("BTQ");
  await siteForm.getByLabel("City").fill("Lyon");
  await page.getByRole("button", { name: "Add site" }).click();
  await expect(page.getByText("Boutique Test")).toBeVisible();

  // Create a labour rate and an energy tariff.
  await page.getByRole("link", { name: "Labour and energy" }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings\?section=rates$/);

  const labourForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add labour rate" }) });
  await labourForm.getByLabel("Role").fill("Pâtissier");
  await labourForm.getByLabel("Hourly cost").fill("18.50");
  await page.getByRole("button", { name: "Add labour rate" }).click();
  await expect(page.getByText("Pâtissier")).toBeVisible();

  const energyForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add energy tariff" }) });
  await energyForm.getByLabel("Price per kWh").fill("0.2516");
  await page.getByRole("button", { name: "Add energy tariff" }).click();
  await expect(page.getByText("Electricity").last()).toBeVisible();

  // Create equipment.
  await page.getByRole("link", { name: "Equipment", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings\?section=equipment$/);

  await page.getByRole("button", { name: "Add equipment" }).click();
  const equipmentForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add equipment" }) });
  await equipmentForm.getByLabel("Name").fill("Four test");
  await equipmentForm.getByLabel("Power").fill("3.5");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add equipment" })
    .click();
  await expect(page.getByText("Four test")).toBeVisible();
});
