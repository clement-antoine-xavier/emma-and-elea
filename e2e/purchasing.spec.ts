import { expect, test } from "@playwright/test";
import { deleteOrganizationBySlug, deleteUserByEmail } from "./db";
import { gotoHydrated } from "./helpers";

const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-purchasing-${unique}@example.com`;
const password = "password12345";
const slug = `e2e-purchasing-${unique}`;

test.afterAll(async () => {
  await deleteOrganizationBySlug(slug);
  await deleteUserByEmail(email);
});

test("a receipt posts lots and stock movements", async ({ page }) => {
  await gotoHydrated(page, "/sign-up");
  await page.getByLabel("Name").fill("Purchase Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByLabel("Business name").fill("Purchase Bakery");
  await page.getByLabel("Workspace address").fill(slug);
  await page.getByLabel("Site code").fill("PUR");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // An item to receive.
  await page.getByRole("link", { name: "Catalog", exact: true }).click();
  await page.getByRole("link", { name: "New item" }).click();
  const itemForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create item" }) });
  await itemForm.getByLabel("Name").fill("Farine d’achat");
  await itemForm.getByLabel("Code").fill("ACH-FARINE");
  await itemForm.getByRole("switch", { name: "Purchasable" }).click();
  await page.getByRole("button", { name: "Create item" }).click();
  await expect(page).toHaveURL(/\/dashboard\/catalog\/items\//);

  // A supplier and one supplier price.
  await page.getByRole("link", { name: "Purchasing", exact: true }).click();
  await page.getByRole("link", { name: "Suppliers" }).click();
  const supplierForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add supplier" }) });
  await supplierForm.getByLabel("Name").fill("Minoterie d’épreuve");
  await supplierForm.getByLabel("Code").fill("MIN");
  await supplierForm.getByLabel("City").fill("Lyon");
  await page.getByRole("button", { name: "Add supplier" }).click();
  await expect(page).toHaveURL(/\/dashboard\/purchasing\/suppliers\//);
  await expect(
    page.getByRole("heading", { name: "Minoterie d’épreuve" }),
  ).toBeVisible();

  const priceForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add supplier price" }) });
  await priceForm.getByRole("combobox", { name: "Item" }).click();
  await page
    .getByRole("option", { name: /ACH-FARINE/ })
    .click();
  await priceForm.getByLabel("Pack quantity").fill("25");
  await priceForm.getByRole("combobox", { name: "Pack unit" }).click();
  await page.getByRole("option", { name: /^kg/ }).click();
  await priceForm.getByLabel("Pack price").fill("27.50");
  await page.getByRole("button", { name: "Add supplier price" }).click();
  await expect(
    page
      .getByRole("group", { name: "Table" })
      .getByText("Farine d’achat"),
  ).toBeVisible();

  // Draft receipt.
  await page.getByRole("link", { name: "Purchasing", exact: true }).click();
  await page.getByRole("link", { name: "New receipt" }).click();
  const receiptForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create draft" }) });
  await receiptForm.getByRole("combobox", { name: "Supplier" }).click();
  await page
    .getByRole("option", { name: /Minoterie d’épreuve/ })
    .click();
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/dashboard\/purchasing\/receipts\//);
  await expect(page.getByRole("heading", { name: /GR-\d{6}-\d{3}/ })).toBeVisible();

  // Add a line: 10 kg at 2.75 per kg.
  const lineForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add line" }) });
  await lineForm.getByRole("combobox", { name: "Item" }).click();
  await page
    .getByRole("option", { name: /ACH-FARINE/ })
    .click();
  await lineForm.getByLabel("Quantity").fill("10");
  await lineForm.getByRole("combobox", { name: "Unit" }).click();
  await page.getByRole("option", { name: /^kg/ }).click();
  await lineForm.getByLabel("Unit price").fill("2.75");
  await page.getByRole("button", { name: "Add line" }).click();
  await expect(page.getByRole("cell", { name: "Farine d’achat" })).toBeVisible();

  // Posting creates the lot and the movement.
  await page.getByRole("button", { name: "Post receipt" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Post receipt" })
    .click();
  await expect(page.getByText("Posted").first()).toBeVisible();
  await expect(page.getByText(/PUR-\d{6}-\d{3}/)).toBeVisible();

  // Stock reflects the remaining lot quantity.
  await page.getByRole("link", { name: "Stock", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/stock$/);
  const stockRow = page.getByRole("row", { name: /Farine d’achat/ });
  await expect(stockRow.getByRole("cell", { name: "10 kg" })).toBeVisible();

  // The lot ledger has the receipt movement.
  await page.getByRole("link", { name: "All lots" }).click();
  await expect(page).toHaveURL(/\/dashboard\/stock\/lots$/);
  await expect(
    page.getByRole("cell", { name: /PUR-\d{6}-\d{3}/ }),
  ).toBeVisible();
  await page
    .getByRole("row", { name: /PUR-\d{6}-\d{3}/ })
    .getByRole("link", { name: "Open" })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/stock\/lots\//);
  await expect(page.getByText("Receipt").first()).toBeVisible();
  await expect(page.getByText("PURCHASE_RECEIPT").first()).toBeVisible();
});
