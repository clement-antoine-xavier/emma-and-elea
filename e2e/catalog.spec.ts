import { expect, test } from "@playwright/test";
import { deleteOrganizationBySlug, deleteUserByEmail } from "./db";
import { gotoHydrated } from "./helpers";

const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-catalog-${unique}@example.com`;
const password = "password12345";
const slug = `e2e-catalog-${unique}`;

test.afterAll(async () => {
  await deleteOrganizationBySlug(slug);
  await deleteUserByEmail(email);
});

test("catalog manages categories, items and allergens", async ({ page }) => {
  await gotoHydrated(page, "/sign-up");
  await page.getByLabel("Name").fill("Catalog Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByLabel("Business name").fill("Catalog Bakery");
  await page.getByLabel("Workspace address").fill(slug);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Categories: a root and one child.
  await page.getByRole("link", { name: "Catalog", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/catalog$/);
  await expect(page.getByText("No items yet")).toBeVisible();

  await page.getByRole("link", { name: "Categories" }).click();
  await page.getByRole("button", { name: "Add a category" }).click();
  const categoryForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add category" }) });
  await categoryForm.getByLabel("Name").fill("Matières premières");
  await page.getByRole("button", { name: "Add category" }).click();
  await expect(page.getByText("Matières premières")).toBeVisible();

  await page.getByRole("button", { name: "Add a category" }).click();
  await categoryForm.getByLabel("Name").fill("Farines");
  await categoryForm.getByRole("combobox", { name: "Parent category" }).click();
  await page.getByRole("option", { name: "Matières premières" }).click();
  await page.getByRole("button", { name: "Add category" }).click();
  await expect(page.getByText("Farines")).toBeVisible();

  // A raw material with an allergen.
  await page.getByRole("link", { name: "Back to catalog" }).click();
  await page.getByRole("link", { name: "New item" }).click();
  const itemForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create item" }) });
  await itemForm.getByLabel("Name").fill("Farine d’épreuve");
  await itemForm.getByLabel("Code").fill("TEST-FARINE");
  await itemForm.getByRole("switch", { name: "Purchasable" }).click();
  await page.getByRole("button", { name: "Create item" }).click();
  await expect(page).toHaveURL(/\/dashboard\/catalog\/items\//);
  await expect(
    page.getByRole("heading", { name: "Farine d’épreuve" }),
  ).toBeVisible();

  const allergenForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Save allergen" }) });
  await allergenForm
    .getByRole("combobox", { name: "Allergen" })
    .click();
  await page
    .getByRole("option", { name: "Cereals containing gluten" })
    .click();
  await page.getByRole("button", { name: "Save allergen" }).click();
  await expect(
    page.getByRole("cell", { name: "Cereals containing gluten" }),
  ).toBeVisible();

  // A sellable finished product requires a sale unit and a price.
  await page.getByRole("link", { name: "Back to catalog" }).click();
  await page.getByRole("link", { name: "New item" }).click();
  await itemForm.getByLabel("Name").fill("Croissant d’épreuve");
  await itemForm.getByLabel("Code").fill("TEST-CROISSANT");
  await itemForm.getByRole("combobox", { name: "Type" }).click();
  await page.getByRole("option", { name: "Finished product" }).click();
  await itemForm.getByRole("combobox", { name: "Stock unit" }).click();
  await page.getByRole("option", { name: /^piece/ }).click();
  await itemForm.getByRole("combobox", { name: "Sale unit" }).click();
  await page.getByRole("option", { name: /^piece/ }).click();
  await itemForm.getByLabel("Sale price").fill("1.60");
  await itemForm.getByRole("switch", { name: "Sellable" }).click();
  await page.getByRole("button", { name: "Create item" }).click();
  await expect(page).toHaveURL(/\/dashboard\/catalog\/items\//);
  await expect(
    page.getByRole("heading", { name: "Croissant d’épreuve" }),
  ).toBeVisible();

  // Search keeps the list usable as the catalog grows.
  await page.getByRole("link", { name: "Catalog", exact: true }).click();
  await page.getByRole("textbox", {name: "Search"}).fill("Croissant");
  await page.getByRole("textbox", {name: "Search"}).press("Enter");
  const itemTable = page.getByRole("group", { name: "Table" });
  await expect(itemTable.getByText("Croissant d’épreuve")).toBeVisible();
  await expect(itemTable.getByText("Farine d’épreuve")).toHaveCount(0);
});
