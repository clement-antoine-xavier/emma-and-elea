import {expect, test} from "@playwright/test";
import {instant} from "@next/playwright";
import {deleteOrganizationBySlug, deleteUserByEmail} from "../db";
import {signUpAndCreateWorkspace} from "../helpers";

const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-instant-dashboard-${unique}@example.com`;
const password = "password12345";
const slug = `e2e-instant-dashboard-${unique}`;

test.afterAll(async () => {
  await deleteOrganizationBySlug(slug);
  await deleteUserByEmail(email);
});

test("dashboard navigation renders the page fallback before data", async ({
  page,
}) => {
  await signUpAndCreateWorkspace(page, {
    name: "Instant Dashboard",
    email,
    password,
    businessName: "Instant Dashboard Bakery",
    slug,
    siteName: "Instant Dashboard Atelier",
    siteCode: "IDB",
  });

  await expect(
    page.getByRole("link", {name: "Alerts", exact: true}),
  ).toBeVisible();

  await instant(page, async () => {
    await page.getByRole("link", {name: "Alerts", exact: true}).click();
    await page.waitForURL((url) => url.pathname === "/dashboard/alerts");
    await expect(page.getByTestId("page-loading")).toBeVisible();
  });

  await expect(
    page.getByRole("heading", {name: "Alerts"}),
  ).toBeVisible({timeout: 20_000});
});
