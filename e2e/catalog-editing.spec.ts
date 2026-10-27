import {expect, test} from "@playwright/test";
import {deleteOrganizationBySlug, deleteUserByEmail, seedItems} from "./db";
import {gotoHydrated, signUpAndCreateWorkspace} from "./helpers";

const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-catalog-edit-${unique}@example.com`;
const password = "password12345";
const slug = `e2e-catalog-edit-${unique}`;

test.afterAll(async () => {
  await deleteOrganizationBySlug(slug);
  await deleteUserByEmail(email);
});

test("edits, archives, filters and paginates the catalog", async ({page}) => {
  await signUpAndCreateWorkspace(page, {
    name: "Catalog Editor",
    email,
    password,
    businessName: "Editing Bakery",
    slug,
    siteCode: "EDT",
  });

  // Create an item, then rename it from its detail screen.
  await page.getByRole("link", {name: "Catalog", exact: true}).click();
  await page.getByRole("link", {name: "New item"}).click();
  const itemForm = page
    .locator("form")
    .filter({has: page.getByRole("button", {name: "Create item"})});
  await itemForm.getByLabel("Name").fill("Editing flour");
  await itemForm.getByLabel("Code").fill("EDIT-FLOUR");
  await page.getByRole("button", {name: "Create item"}).click();
  await expect(page).toHaveURL(/\/dashboard\/catalog\/items\//);

  const editForm = page
    .locator("form")
    .filter({has: page.getByRole("button", {name: "Save item"})});
  await editForm.getByLabel("Name").fill("Edited flour");
  await page.getByRole("button", {name: "Save item"}).click();
  await expect(page.getByText("Item saved.")).toBeVisible();
  await expect(
    page.getByRole("heading", {name: "Edited flour"}),
  ).toBeVisible();

  // Archive it through the confirmation dialog.
  await page.getByRole("button", {name: "Archive", exact: true}).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", {name: "Archive item"})
    .click();
  await expect(page).toHaveURL(/\/dashboard\/catalog$/);

  // It disappears from the default list and reappears with archived rows.
  await page.getByLabel("Search").fill("Edited flour");
  await page.getByRole("button", {name: "Apply filters"}).click();
  const table = page.getByRole("group", {name: "Table"});
  await expect(table.getByText("Edited flour")).toHaveCount(0);

  await page.getByLabel("Include archived").click();
  await page.getByRole("button", {name: "Apply filters"}).click();
  await expect(table.getByText("Edited flour")).toBeVisible();
  await expect(table.getByText("Archived").first()).toBeVisible();

  // A category with a child cannot be archived; the empty child can.
  await page.getByRole("link", {name: "Categories"}).click();
  const categoryForm = page
    .locator("form")
    .filter({has: page.getByRole("button", {name: "Add category"})});

  await categoryForm.getByLabel("Name").fill("Guard parent");
  await page.getByRole("button", {name: "Add category"}).click();
  await expect(
    page.getByRole("cell", {name: "Guard parent", exact: true}).first(),
  ).toBeVisible();

  await categoryForm.getByLabel("Name").fill("Guard child");
  await categoryForm.getByRole("combobox", {name: "Parent category"}).click();
  await page.getByRole("option", {name: "Guard parent"}).click();
  await page.getByRole("button", {name: "Add category"}).click();
  await expect(
    page.getByRole("cell", {name: /Guard child/}),
  ).toBeVisible();

  // The parent row is the only one with a child count of 1.
  const parentRow = page
    .getByRole("row")
    .filter({has: page.getByRole("cell", {name: "1", exact: true})})
    .first();
  await parentRow.getByRole("button", {name: "Archive"}).click();
  await expect(
    page.getByText("Check the highlighted fields.").first(),
  ).toBeVisible();

  const childRow = page
    .getByRole("row")
    .filter({has: page.getByRole("cell", {name: /Guard child/})});
  await childRow.getByRole("button", {name: "Archive"}).click();
  await expect(childRow.getByText("Archived")).toBeVisible();

  // Seed enough rows to cross the default 25-row page size.
  await seedItems(slug, 30);
  await gotoHydrated(page, "/dashboard/catalog");

  const pagination = page.getByRole("navigation", {name: "Catalog pagination"});
  await expect(pagination).toBeVisible();
  await pagination.getByRole("button", {name: /next/i}).click();

  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText("Seed item 29")).toBeVisible();
});
