import { expect, test } from "@playwright/test";
import {
  deleteOrganizationBySlug,
  deleteUserByEmail,
  salesFacts,
} from "./db";
import { clickNav, gotoHydrated, pickOption } from "./helpers";

const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-sales-${unique}@example.com`;
const password = "password12345";
const slug = `e2e-sales-${unique}`;

test.afterAll(async () => {
  await deleteOrganizationBySlug(slug);
  await deleteUserByEmail(email);
});

test("an order dispatch consumes lots and reports leave daily sales untouched", async ({
  page,
}) => {
  await gotoHydrated(page, "/sign-up");
  await page.getByLabel("Name").fill("Sales Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByLabel("Business name").fill("Sales Bakery");
  await page.getByLabel("Workspace address").fill(slug);
  await page.getByLabel("Site code").fill("SAL");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // A purchasable item and a received lot to dispatch from.
  await page.getByRole("link", { name: "Catalog", exact: true }).click();
  await page.getByRole("link", { name: "New item" }).click();
  const itemForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create item" }) });
  await itemForm.getByLabel("Name").fill("Flour sales");
  await itemForm.getByLabel("Code").fill("SAL-FLOUR");
  await itemForm.getByRole("switch", { name: "Purchasable" }).click();
  await page.getByRole("button", { name: "Create item" }).click();
  await expect(page).toHaveURL(/\/dashboard\/catalog\/items\//);

  await clickNav(page, "Purchasing", "/dashboard/purchasing");
  await page.getByRole("link", { name: "Suppliers" }).click();
  await page.getByRole("button", { name: "Add a supplier" }).click();
  const supplierForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add supplier" }) });
  await supplierForm.getByLabel("Name").fill("Sales supplier");
  await supplierForm.getByLabel("Code").fill("SALSUP");
  await page.getByRole("button", { name: "Add supplier" }).click();
  await expect(page).toHaveURL(/\/dashboard\/purchasing\/suppliers\//);

  await clickNav(page, "Purchasing", "/dashboard/purchasing");
  await page.getByRole("link", { name: "New receipt" }).click();
  const receiptForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create draft" }) });
  await pickOption(
    page,
    receiptForm.getByRole("combobox", { name: "Supplier" }),
    /Sales supplier/,
  );
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/dashboard\/purchasing\/receipts\//);

  const receiptLineForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add line" }) });
  await pickOption(
    page,
    receiptLineForm.getByRole("combobox", { name: "Item" }),
    /SAL-FLOUR/,
  );
  await receiptLineForm.getByLabel("Quantity").fill("25");
  await pickOption(
    page,
    receiptLineForm.getByRole("combobox", { name: "Unit" }),
    /^kg/,
  );
  await receiptLineForm.getByLabel("Unit price").fill("1.10");
  await page.getByRole("button", { name: "Add line" }).click();
  await page.getByRole("button", { name: "Post receipt" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Post receipt" })
    .click();
  await expect(page.getByText("Posted").first()).toBeVisible();

  // Customer.
  await page.getByRole("link", { name: "Sales", exact: true }).click();
  await page.getByRole("link", { name: "Customers" }).click();
  await page.getByRole("button", { name: "New customer" }).click();
  const customerForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create customer" }) });
  await customerForm.getByLabel("Name").fill("Sales customer");
  await customerForm.getByLabel("Code").fill("SALCLI");
  await page.getByRole("button", { name: "Create customer" }).click();
  await expect(page.getByText("Sales customer").first()).toBeVisible();

  await page.getByRole("link", { name: "Edit" }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/sales\/customers\//);
  const editCustomerForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Save customer" }) });
  await editCustomerForm.getByLabel("Name").fill("Sales customer edited");
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByText("Customer updated")).toBeVisible();
  await page.getByRole("link", { name: "Back to customers" }).click();
  await expect(page.getByText("Sales customer edited").first()).toBeVisible();
  await page.getByRole("link", { name: "Back to sales" }).click();

  // Draft order with one line, then confirm.
  const orderForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create draft order" }) });
  await pickOption(
    page,
    orderForm.getByRole("combobox", { name: "Customer" }),
    /SALCLI/,
  );
  await page.getByRole("button", { name: "Create draft order" }).click();
  await expect(page).toHaveURL(/\/dashboard\/sales\/orders\//);
  const orderNumber = await page.getByRole("heading", { level: 1 }).innerText();

  const orderLineForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add line" }) });
  await pickOption(
    page,
    orderLineForm.getByRole("combobox", { name: "Item" }),
    /SAL-FLOUR/,
  );
  await orderLineForm.getByLabel("Quantity").fill("2");
  await pickOption(
    page,
    orderLineForm.getByRole("combobox", { name: "Unit" }),
    /^kg/,
  );
  await orderLineForm.getByLabel("Unit price").fill("3");
  await page.getByRole("button", { name: "Add line" }).click();
  await page.getByRole("button", { name: "Confirm order" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Confirm order" })
    .click();
  await expect(page.getByText("Confirmed").first()).toBeVisible();

  // Dispatch one kilo from the lot and link it to the order.
  await page.getByRole("link", { name: "Sales", exact: true }).click();
  await page.getByRole("link", { name: "Dispatches" }).click();
  const dispatchForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create draft dispatch" }) });
  await pickOption(
    page,
    dispatchForm.getByRole("combobox", { name: "Customer" }),
    /SALCLI/,
  );
  await pickOption(
    page,
    dispatchForm.getByRole("combobox", { name: "Order" }),
    new RegExp(orderNumber),
  );
  await page.getByRole("button", { name: "Create draft dispatch" }).click();
  await expect(page).toHaveURL(/\/dashboard\/sales\/dispatches\//);

  const dispatchLineForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add line" }) });
  await pickOption(
    page,
    dispatchLineForm.getByRole("combobox", { name: "Lot" }),
    /Flour sales/,
  );
  await dispatchLineForm.getByLabel("Quantity").fill("1");
  await page.getByRole("button", { name: "Add line" }).click();
  await page.getByRole("button", { name: "Post dispatch" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Post dispatch" })
    .click();
  await expect(page.getByText("Dispatched").first()).toBeVisible();

  await expect
    .poll(async () => (await salesFacts(slug)).dispatchStatus)
    .toBe("DISPATCHED");
  const facts = await salesFacts(slug);
  expect(facts.orderStatus).toBe("READY");
  expect(Number(facts.orderedQuantity)).toBe(2);
  expect(Number(facts.fulfilledQuantity)).toBe(1);
  expect(Number(facts.lotRemaining)).toBe(24);
  expect(Number(facts.dispatchMovement)).toBe(-1);
  expect(facts.dailySalesCount).toBe(0);

  // A draft order can be cancelled before preparation.
  await page.getByRole("link", { name: "Sales", exact: true }).click();
  const cancelOrderForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create draft order" }) });
  await pickOption(
    page,
    cancelOrderForm.getByRole("combobox", { name: "Customer" }),
    /SALCLI/,
  );
  await page.getByRole("button", { name: "Create draft order" }).click();
  await expect(page).toHaveURL(/\/dashboard\/sales\/orders\//);
  await page.getByRole("button", { name: "Cancel order" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel order" })
    .click();
  await expect(page.getByText("Cancelled").first()).toBeVisible();

  // A draft dispatch can be cancelled without touching stock.
  await page.getByRole("link", { name: "Sales", exact: true }).click();
  await page.getByRole("link", { name: "Dispatches" }).click();
  const cancelDispatchForm = page
    .locator("form")
    .filter({
      has: page.getByRole("button", { name: "Create draft dispatch" }),
    });
  await pickOption(
    page,
    cancelDispatchForm.getByRole("combobox", { name: "Customer" }),
    /SALCLI/,
  );
  await page.getByRole("button", { name: "Create draft dispatch" }).click();
  await expect(page).toHaveURL(/\/dashboard\/sales\/dispatches\//);
  await page.getByRole("button", { name: "Cancel dispatch" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel dispatch" })
    .click();
  await expect(page.getByText("Cancelled").first()).toBeVisible();

  // Daily sales are entered separately and feed the reports.
  await page.getByRole("link", { name: "Sales", exact: true }).click();
  await page.getByRole("link", { name: "Daily sales" }).click();
  const dailyForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Save sales" }) });
  await pickOption(
    page,
    dailyForm.getByRole("combobox", { name: "Item" }),
    /SAL-FLOUR/,
  );
  await dailyForm.getByLabel("Quantity sold").fill("1");
  await dailyForm.getByLabel("Revenue").fill("3");
  await page.getByRole("button", { name: "Save sales" }).click();
  await expect
    .poll(async () => (await salesFacts(slug)).dailySalesCount)
    .toBe(1);

  await page.getByRole("link", { name: "Reports", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await expect(page.getByText("Summary").first()).toBeVisible();
});
