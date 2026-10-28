import {expect, test} from "@playwright/test";
import {deleteOrganizationBySlug, deleteUserByEmail} from "./db";
import {signUpAndCreateWorkspace} from "./helpers";

const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-dashboard-${unique}@example.com`;
const slug = `e2e-dashboard-${unique}`;

test.afterAll(async () => {
  await deleteOrganizationBySlug(slug);
  await deleteUserByEmail(email);
});

test("shows the operations dashboard and switches the period", async ({
  page,
}) => {
  await signUpAndCreateWorkspace(page, {
    name: "Dashboard User",
    email,
    password: "password12345",
    businessName: "Dashboard Bakery",
    slug,
    siteName: "Dashboard Site",
    siteCode: "DSH",
  });

  await expect(page.getByRole("heading", {level: 1})).toContainText("Hello");
  await expect(page.getByText("Batches today")).toBeVisible();
  await expect(page.getByText("Revenue").first()).toBeVisible();
  await expect(page.getByText("Below minimum")).toBeVisible();
  await expect(page.getByText("Waste cost")).toBeVisible();

  await expect(
    page.getByRole("heading", {name: "Revenue", level: 3}),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {name: "Production", level: 3}),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {name: "Stock alerts", level: 3}),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {name: "Recent orders", level: 3}),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {name: "Upcoming batches", level: 3}),
  ).toBeVisible();

  await expect(page.getByText("Every item is above its minimum.")).toBeVisible();
  await expect(page.getByText("No orders yet.")).toBeVisible();
  await expect(page.getByText("No planned batches.")).toBeVisible();

  await page.getByRole("radio", {name: "7 days"}).click();
  await expect(page).toHaveURL(/period=7/);
  await expect(page.getByText("Last 7 days").first()).toBeVisible();

});
