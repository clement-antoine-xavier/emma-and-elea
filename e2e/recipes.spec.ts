import { expect, test } from "@playwright/test";
import { deleteOrganizationBySlug, deleteUserByEmail } from "./db";
import { gotoHydrated } from "./helpers";

const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-recipes-${unique}@example.com`;
const password = "password12345";
const slug = `e2e-recipes-${unique}`;

test.afterAll(async () => {
  await deleteOrganizationBySlug(slug);
  await deleteUserByEmail(email);
});

test("a recipe publishes a cost snapshot", async ({ page }) => {
  await gotoHydrated(page, "/sign-up");
  await page.getByLabel("Name").fill("Recipe Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByLabel("Business name").fill("Recipe Bakery");
  await page.getByLabel("Workspace address").fill(slug);
  await page.getByLabel("Site code").fill("REC");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Costing references: one labour rate, one equipment, one tariff.
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("link", { name: "Manage rates" }).click();
  const labourForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add labour rate" }) });
  await labourForm.getByLabel("Role").fill("Pâtissier");
  await labourForm.getByLabel("Hourly cost").fill("18.50");
  await page.getByRole("button", { name: "Add labour rate" }).click();
  const energyForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add energy tariff" }) });
  await energyForm.getByLabel("Price per kWh").fill("0.2516");
  await page.getByRole("button", { name: "Add energy tariff" }).click();

  await page.getByRole("link", { name: "Back to settings" }).click();
  await page.getByRole("link", { name: "Manage equipment" }).click();
  const equipmentForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add equipment" }) });
  await equipmentForm.getByLabel("Name").fill("Four recette");
  await equipmentForm.getByLabel("Power").fill("3.5");
  await page.getByRole("button", { name: "Add equipment" }).click();

  // Two items: a raw material and the finished product.
  await page.getByRole("link", { name: "Catalog", exact: true }).click();
  await page.getByRole("link", { name: "New item" }).click();
  let itemForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create item" }) });
  await itemForm.getByLabel("Name").fill("Farine recette");
  await itemForm.getByLabel("Code").fill("REC-FARINE");
  await itemForm.getByRole("switch", { name: "Purchasable" }).click();
  await page.getByRole("button", { name: "Create item" }).click();
  await expect(page).toHaveURL(/\/dashboard\/catalog\/items\//);

  await page.getByRole("link", { name: "Catalog", exact: true }).click();
  await page.getByRole("link", { name: "New item" }).click();
  itemForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create item" }) });
  await itemForm.getByLabel("Name").fill("Croissant recette");
  await itemForm.getByLabel("Code").fill("REC-CROISSANT");
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

  // Supplier price for the flour.
  await page.getByRole("link", { name: "Purchasing", exact: true }).click();
  await page.getByRole("link", { name: "Suppliers" }).click();
  const supplierForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add supplier" }) });
  await supplierForm.getByLabel("Name").fill("Minoterie recette");
  await supplierForm.getByLabel("Code").fill("MIR");
  await page.getByRole("button", { name: "Add supplier" }).click();
  await expect(page).toHaveURL(/\/dashboard\/purchasing\/suppliers\//);

  const priceForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add supplier price" }) });
  await priceForm.getByRole("combobox", { name: "Item" }).click();
  await page.getByRole("option", { name: /REC-FARINE/ }).click();
  await priceForm.getByLabel("Pack quantity").fill("25");
  await priceForm.getByRole("combobox", { name: "Pack unit" }).click();
  await page.getByRole("option", { name: /^kg/ }).click();
  await priceForm.getByLabel("Pack price").fill("27.50");
  await page.getByRole("button", { name: "Add supplier price" }).click();

  // Recipe, yield, one line and one operation.
  await page.getByRole("link", { name: "Recipes", exact: true }).click();
  const recipeForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create recipe" }) });
  await recipeForm.getByLabel("Name").fill("Croissant recette");
  await recipeForm.getByLabel("Code").fill("REC-CROISSANT");
  await recipeForm.getByRole("combobox", { name: "Produces" }).click();
  await page.getByRole("option", { name: /REC-CROISSANT/ }).click();
  await page.getByRole("button", { name: "Create recipe" }).click();
  await expect(page).toHaveURL(/\/dashboard\/recipes\/.+\/versions\//);

  await page.getByLabel("Yield quantity").fill("60");
  await page.getByRole("button", { name: "Save version" }).click();
  await expect(page.getByText("Version saved.")).toBeVisible();

  const lineForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add line" }) });
  await lineForm.getByRole("combobox", { name: "Item" }).click();
  await page.getByRole("option", { name: /REC-FARINE/ }).click();
  await lineForm.getByLabel("Quantity").fill("1.5");
  await lineForm.getByRole("combobox", { name: "Unit" }).click();
  await page.getByRole("option", { name: /^kg/ }).click();
  await lineForm.getByLabel("Loss").fill("2");
  await page.getByRole("button", { name: "Add line" }).click();
  await expect(page.getByRole("cell", { name: /REC-FARINE/ })).toBeVisible();

  const operationForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add operation" }) });
  await operationForm.getByLabel("Operation").fill("Cuisson");
  await operationForm.getByLabel("Duration (minutes)").fill("18");
  await operationForm.getByLabel("Active minutes").fill("5");
  await operationForm.getByRole("combobox", { name: "Equipment" }).click();
  await page.getByRole("option", { name: /Four recette/ }).click();
  await page.getByRole("button", { name: "Add operation" }).click();
  await expect(
    page.getByRole("cell", { name: "Cuisson" }).first(),
  ).toBeVisible();

  // Live cost preview, then publish.
  await expect(page.getByText("Cost breakdown")).toBeVisible();
  await page.getByRole("button", { name: "Publish version" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Publish version" })
    .click();
  await expect(page.getByText("Published").first()).toBeVisible();
  await expect(page.getByText("Stored snapshot")).toBeVisible();
});
