import { expect, test } from "@playwright/test";
import { deleteOrganizationBySlug, deleteUserByEmail } from "./db";
import { clickNav, gotoHydrated, pickOption } from "./helpers";

const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-production-${unique}@example.com`;
const password = "password12345";
const slug = `e2e-production-${unique}`;

test.afterAll(async () => {
  await deleteOrganizationBySlug(slug);
  await deleteUserByEmail(email);
});

test("a completed batch consumes lots and creates a traceable output", async ({
  page,
}) => {
  await gotoHydrated(page, "/sign-up");
  await page.getByLabel("Name").fill("Production Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByLabel("Business name").fill("Production Bakery");
  await page.getByLabel("Workspace address").fill(slug);
  await page.getByLabel("Site code").fill("PRD");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Costing references.
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
  await equipmentForm.getByLabel("Name").fill("Four production");
  await equipmentForm.getByLabel("Power").fill("3.5");
  await page.getByRole("button", { name: "Add equipment" }).click();

  // Raw material first: this keeps the receipt item picker unambiguous.
  await page.getByRole("link", { name: "Catalog", exact: true }).click();
  await page.getByRole("link", { name: "New item" }).click();
  const flourForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create item" }) });
  await flourForm.getByLabel("Name").fill("Farine production");
  await flourForm.getByLabel("Code").fill("PRD-FARINE");
  await flourForm.getByRole("switch", { name: "Purchasable" }).click();
  await page.getByRole("button", { name: "Create item" }).click();
  await expect(page).toHaveURL(/\/dashboard\/catalog\/items\//);

  // Supplier and price.
  await clickNav(page, "Purchasing", "/dashboard/purchasing");
  await page.getByRole("link", { name: "Suppliers" }).click();
  const supplierForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add supplier" }) });
  await supplierForm.getByLabel("Name").fill("Minoterie production");
  await supplierForm.getByLabel("Code").fill("MNP");
  await page.getByRole("button", { name: "Add supplier" }).click();
  await expect(page).toHaveURL(/\/dashboard\/purchasing\/suppliers\//);
  const priceForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add supplier price" }) });
  await priceForm.getByRole("combobox", { name: "Item" }).click();
  await page.getByRole("option", { name: /PRD-FARINE/ }).click();
  await priceForm.getByLabel("Pack quantity").fill("25");
  await priceForm.getByRole("combobox", { name: "Pack unit" }).click();
  await page.getByRole("option", { name: /^kg/ }).click();
  await priceForm.getByLabel("Pack price").fill("27.50");
  await page.getByRole("button", { name: "Add supplier price" }).click();

  // Receive 25 kg of flour.
  await clickNav(page, "Purchasing", "/dashboard/purchasing");
  await page.getByRole("link", { name: "New receipt" }).click();
  const receiptForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create draft" }) });
  await receiptForm.getByRole("combobox", { name: "Supplier" }).click();
  await page.getByRole("option", { name: /Minoterie production/ }).click();
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/dashboard\/purchasing\/receipts\//);
  const receiptLineForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add line" }) });
  await receiptLineForm.getByRole("combobox", { name: "Item" }).click();
  await page.getByRole("option", { name: /PRD-FARINE/ }).click();
  await receiptLineForm.getByLabel("Quantity").fill("25");
  await receiptLineForm.getByRole("combobox", { name: "Unit" }).click();
  await page.getByRole("option", { name: /^kg/ }).click();
  await receiptLineForm.getByLabel("Unit price").fill("1.10");
  await page.getByRole("button", { name: "Add line" }).click();
  await page.getByRole("button", { name: "Post receipt" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Post receipt" })
    .click();
  await expect(page.getByText("Posted").first()).toBeVisible();

  // Finished product.
  await page.getByRole("link", { name: "Catalog", exact: true }).click();
  await page.getByRole("link", { name: "New item" }).click();
  const croissantForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create item" }) });
  await croissantForm.getByLabel("Name").fill("Croissant production");
  await croissantForm.getByLabel("Code").fill("PRD-CROISSANT");
  await croissantForm.getByRole("combobox", { name: "Type" }).click();
  await page.getByRole("option", { name: "Finished product" }).click();
  await croissantForm.getByRole("combobox", { name: "Stock unit" }).click();
  await page.getByRole("option", { name: /^piece/ }).click();
  await croissantForm.getByRole("combobox", { name: "Sale unit" }).click();
  await page.getByRole("option", { name: /^piece/ }).click();
  await croissantForm.getByLabel("Sale price").fill("1.60");
  await croissantForm.getByRole("switch", { name: "Sellable" }).click();
  await page.getByRole("button", { name: "Create item" }).click();
  await expect(page).toHaveURL(/\/dashboard\/catalog\/items\//);

  // Recipe and published version.
  await page.getByRole("link", { name: "Recipes", exact: true }).click();
  const recipeForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create recipe" }) });
  await recipeForm.getByLabel("Name").fill("Croissant production");
  await recipeForm.getByLabel("Code").fill("PRD-CROISSANT");
  await recipeForm.getByRole("combobox", { name: "Produces" }).click();
  await page.getByRole("option", { name: /PRD-CROISSANT/ }).click();
  await page.getByRole("button", { name: "Create recipe" }).click();
  await expect(page).toHaveURL(/\/dashboard\/recipes\/.+\/versions\//);

  await page.getByLabel("Yield quantity").fill("60");
  await page.getByRole("button", { name: "Save version" }).click();
  const lineForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add line" }) });
  await lineForm.getByRole("combobox", { name: "Item" }).click();
  await page.getByRole("option", { name: /PRD-FARINE/ }).click();
  await lineForm.getByLabel("Quantity").fill("1.5");
  await lineForm.getByRole("combobox", { name: "Unit" }).click();
  await page.getByRole("option", { name: /^kg/ }).click();
  await lineForm.getByLabel("Loss").fill("2");
  await page.getByRole("button", { name: "Add line" }).click();
  const operationForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add operation" }) });
  await operationForm.getByLabel("Operation").fill("Cuisson");
  await operationForm.getByLabel("Duration (minutes)").fill("18");
  await operationForm.getByLabel("Active minutes").fill("5");
  await operationForm.getByRole("combobox", { name: "Equipment" }).click();
  await page.getByRole("option", { name: /Four production/ }).click();
  await page.getByRole("button", { name: "Add operation" }).click();
  await page.getByRole("button", { name: "Publish version" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Publish version" })
    .click();
  await expect(page.getByText("Published").first()).toBeVisible();

  // Plan and complete a 30-piece batch.
  await page.getByRole("link", { name: "Production", exact: true }).click();
  const batchForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Plan batch" }) });
  await batchForm.getByRole("combobox", { name: "Recipe version" }).click();
  await page.getByRole("option", { name: /Croissant production/ }).click();
  await batchForm.getByLabel("Planned quantity").fill("30");
  await page.getByRole("button", { name: "Plan batch" }).click();
  await expect(page).toHaveURL(/\/dashboard\/production\/batches\//);

  await page.getByRole("button", { name: "Start batch" }).click();
  await page.getByLabel("Actual quantity").fill("30");
  await page.getByRole("button", { name: "Complete batch" }).click();
  await expect(page.getByText("Completed").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cost breakdown" }).last(),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /PRD-\d{6}-\d{3}/ }).first(),
  ).toBeVisible();

  // Stock reflects the consumption and the finished lot.
  await page.getByRole("link", { name: "Stock", exact: true }).click();
  const flourRow = page.getByRole("row", { name: /Farine production/ });
  await expect(flourRow.getByRole("cell", { name: "24.235 kg" })).toBeVisible();
  const croissantRow = page.getByRole("row", { name: /Croissant production/ });
  await expect(croissantRow.getByRole("cell", { name: "30 piece" })).toBeVisible();

  // The finished lot traces back to the batch.
  await page.getByRole("link", { name: "All lots" }).click();
  await page
    .getByRole("row", { name: /Croissant production/ })
    .getByRole("link", { name: "Open" })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Traceability" }).last(),
  ).toBeVisible();
  await expect(page.getByText(/B-\d{6}-\d{3}/).first()).toBeVisible();

  // Reports read the published cost snapshot and the completed batch.
  await page.getByRole("link", { name: "Reports", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Product margins" }),
  ).toBeVisible();
  await expect(page.getByText("Croissant production").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Batch yields" }),
  ).toBeVisible();

  // Daily sales feed the forecast, which creates a plan and then a batch.
  const yesterday = new Date();
  yesterday.setUTCHours(0, 0, 0, 0);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const planDate = new Date(yesterday);
  planDate.setUTCDate(planDate.getUTCDate() + 7);
  const isoDate = (date: Date) => date.toISOString().slice(0, 10);

  await page.getByRole("link", { name: "Sales", exact: true }).click();
  await page.getByRole("link", { name: "Daily sales" }).click();
  const dailySalesForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Save sales" }) });
  await pickOption(
    page,
    dailySalesForm.getByRole("combobox", { name: "Item" }),
    /Croissant production/,
  );
  await page.getByLabel("Business date").fill(isoDate(yesterday));
  await dailySalesForm.getByLabel("Quantity sold").fill("10");
  await dailySalesForm.getByLabel("Revenue").fill("16");
  await page.getByRole("button", { name: "Save sales" }).click();
  await expect(page.getByText("10 piece").first()).toBeVisible();

  await page.getByRole("link", { name: "Production", exact: true }).click();
  await page.getByRole("link", { name: "Planning" }).click();
  await page.getByLabel("Date", { exact: true }).fill(isoDate(planDate));
  await page.getByRole("button", { name: "Show" }).click();
  await expect(
    page.getByRole("heading", { name: "Forecast suggestions" }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Croissant production/ }).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "Create plan" }).click();
  await expect(page).toHaveURL(/\/dashboard\/production\/planning\/.+/);
  await expect(
    page.getByRole("heading", { name: "Production plan" }),
  ).toBeVisible();

  const updateLineForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Update quantity" }) });
  await pickOption(
    page,
    updateLineForm.getByRole("combobox", { name: "Line" }),
    /Croissant production/,
  );
  await updateLineForm.getByLabel("Quantity").fill("30");
  await page.getByRole("button", { name: "Update quantity" }).click();
  await expect(page.getByText("30 piece").first()).toBeVisible();

  await page.getByRole("button", { name: "Confirm plan" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Confirm plan" })
    .click();
  await expect(page.getByText("Confirmed").first()).toBeVisible();

  await page.getByRole("button", { name: "Create batch" }).click();
  await expect(page).toHaveURL(/\/dashboard\/production\/batches\/.+/);
  await expect(page.getByText("30 piece").first()).toBeVisible();

  // Physical count: 24.235 kg expected, 24 kg counted, then posted.
  await page.getByRole("link", { name: "Stock", exact: true }).click();
  await page.getByRole("link", { name: "Stock counts" }).click();
  await page.getByRole("button", { name: "Start count" }).click();
  await expect(page).toHaveURL(/\/dashboard\/stock\/counts\/.+/);

  const flourCountRow = page
    .getByRole("row", { name: /Farine production/ })
    .first();
  await flourCountRow.getByRole("textbox").fill("24");
  await page.getByRole("button", { name: "Save counted quantities" }).click();
  await expect(page.getByText("Counts saved").first()).toBeVisible();
  await expect(page.getByText("-0.235 kg").first()).toBeVisible();

  await page.getByRole("button", { name: "Post count" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Post count" })
    .click();
  await expect(page.getByText("Posted").first()).toBeVisible();

  await page.getByRole("link", { name: "Back to stock" }).click();
  await expect(
    page.getByRole("row", { name: /Farine production/ }).getByRole("cell", {
      name: "24 kg",
    }),
  ).toBeVisible();

  // Waste is written off against a lot and can be reversed.
  await page.getByRole("link", { name: "Production", exact: true }).click();
  await page.getByRole("link", { name: "Waste" }).click();
  await expect(page).toHaveURL(/\/dashboard\/production\/waste$/);

  const wasteForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Record waste" }) });
  await pickOption(
    page,
    wasteForm.getByRole("combobox", { name: "Lot" }),
    /Farine production/,
  );
  await pickOption(
    page,
    wasteForm.getByRole("combobox", { name: "Reason" }),
    /Unsold goods/,
  );
  await wasteForm.getByLabel("Quantity").fill("1");
  await page.getByRole("button", { name: "Record waste" }).click();

  const wasteRow = page.getByRole("row", { name: /Farine production/ }).first();
  await expect(wasteRow).toBeVisible();
  await expect(wasteRow.getByText("1 kg").first()).toBeVisible();
  await expect(wasteRow.getByText("Active")).toBeVisible();

  await wasteRow.getByRole("button", { name: "Archive" }).click();
  await expect(wasteRow.getByText("Reversed")).toBeVisible();
});
