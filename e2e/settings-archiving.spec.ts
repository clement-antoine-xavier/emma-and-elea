import {expect, test} from "@playwright/test";
import {deleteOrganizationBySlug, deleteUserByEmail} from "./db";
import {signUpAndCreateWorkspace} from "./helpers";

const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-settings-archive-${unique}@example.com`;
const password = "password12345";
const slug = `e2e-settings-archive-${unique}`;

test.afterAll(async () => {
  await deleteOrganizationBySlug(slug);
  await deleteUserByEmail(email);
});

test("settings save, edit and archive reference data", async ({page}) => {
  await signUpAndCreateWorkspace(page, {
    name: "Settings Editor",
    email,
    password,
    businessName: "Archive Bakery",
    slug,
    siteName: "Atelier principal",
    siteCode: "ATL",
  });

  // Organization settings persist.
  await page.getByRole("link", {name: "Settings"}).click();
  const organizationForm = page
    .locator("form")
    .filter({has: page.getByRole("button", {name: "Save settings"})});
  await organizationForm.getByLabel("Overhead").fill("12");
  await page.getByRole("button", {name: "Save settings"}).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();

  // Edit a site, then archive it.
  await page.getByRole("link", {name: "Manage sites"}).click();
  const siteForm = page
    .locator("form")
    .filter({has: page.getByRole("button", {name: "Add site"})});
  await siteForm.getByLabel("Site name").fill("Boutique archive");
  await siteForm.getByLabel("Code").fill("BTA");
  await page.getByRole("button", {name: "Add site"}).click();
  await expect(page.getByText("Boutique archive")).toBeVisible();

  await page
    .getByRole("row", {name: /Boutique archive/})
    .getByRole("link", {name: "Edit"})
    .click();
  const siteEditForm = page
    .locator("form")
    .filter({has: page.getByRole("button", {name: "Save site"})});
  await siteEditForm.getByLabel("Site name").fill("Boutique edited");
  await page.getByRole("button", {name: "Save site"}).click();
  await expect(page.getByText("Site saved.")).toBeVisible();
  await page.getByRole("link", {name: "Back to sites"}).first().click();
  await expect(
    page.getByRole("cell", {name: "Boutique edited"}),
  ).toBeVisible();

  const secondSiteRow = page.getByRole("row", {name: /Boutique edited/});
  await secondSiteRow.getByRole("button", {name: "Archive"}).click();
  await expect(secondSiteRow.getByText("Archived")).toBeVisible();

  // The last active site is protected.
  const lastSiteRow = page.getByRole("row", {name: /Atelier principal/});
  await lastSiteRow.getByRole("button", {name: "Archive"}).click();
  await expect(
    page.getByText("You cannot archive the last site.").first(),
  ).toBeVisible();

  // Labour rates and energy tariffs archive and close.
  await page.getByRole("link", {name: "Back to settings"}).first().click();
  await page.getByRole("link", {name: "Manage rates"}).click();

  const labourForm = page
    .locator("form")
    .filter({has: page.getByRole("button", {name: "Add labour rate"})});
  await labourForm.getByLabel("Role").fill("Archived pâtissier");
  await labourForm.getByLabel("Hourly cost").fill("18.5");
  await page.getByRole("button", {name: "Add labour rate"}).click();
  const labourRow = page.getByRole("row", {name: /Archived pâtissier/});
  await labourRow.getByRole("button", {name: "Archive"}).click();
  await expect(labourRow.getByText("Archived")).toBeVisible();

  const energyForm = page
    .locator("form")
    .filter({has: page.getByRole("button", {name: "Add energy tariff"})});
  await energyForm.getByLabel("Price per kWh").fill("0.22");
  await page.getByRole("button", {name: "Add energy tariff"}).click();
  const tariffRow = page.getByRole("row", {name: /Electricity/}).first();
  await tariffRow.getByRole("button", {name: "Close today"}).click();
  await expect(page.getByText("Closed").first()).toBeVisible();

  // Equipment archives.
  await page.getByRole("link", {name: "Back to settings"}).first().click();
  await page.getByRole("link", {name: "Manage equipment"}).click();
  const equipmentForm = page
    .locator("form")
    .filter({has: page.getByRole("button", {name: "Add equipment"})});
  await equipmentForm.getByLabel("Name").fill("Archived oven");
  await equipmentForm.getByLabel("Power").fill("3");
  await page.getByRole("button", {name: "Add equipment"}).click();
  const equipmentRow = page.getByRole("row", {name: /Archived oven/});
  await equipmentRow.getByRole("button", {name: "Archive"}).click();
  await expect(equipmentRow.getByText("Archived")).toBeVisible();
});
