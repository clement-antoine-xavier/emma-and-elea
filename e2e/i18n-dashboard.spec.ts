import {expect, test} from "@playwright/test";
import {deleteOrganizationBySlug, deleteUserByEmail} from "./db";
import {signUpAndCreateWorkspace} from "./helpers";

const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-i18n-dashboard-${unique}@example.com`;
const password = "password12345";
const slug = `e2e-i18n-dashboard-${unique}`;

test.afterAll(async () => {
  await deleteOrganizationBySlug(slug);
  await deleteUserByEmail(email);
});

test("switches the dashboard to French without changing the URL", async ({
  page,
}) => {
  await signUpAndCreateWorkspace(page, {
    name: "I18n Owner",
    email,
    password,
    businessName: "Boulangerie I18n",
    slug,
    siteCode: "I18",
  });

  await expect(
    page.getByRole("heading", {name: "Hello, I18n Owner"}),
  ).toBeVisible();

  await page.getByRole("radio", {name: "Français"}).click();

  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", {name: "Bonjour, I18n Owner"}),
  ).toBeVisible();

  // Server-rendered navigation and the workspace are translated too.
  await expect(page.getByRole("link", {name: "Catalogue"})).toBeVisible();
  await page.getByRole("link", {name: "Catalogue"}).click();
  await expect(page).toHaveURL(/\/dashboard\/catalog$/);
  await expect(
    page.getByRole("heading", {name: "Catalogue", level: 1}),
  ).toBeVisible();

  // The cookie survives a reload; no locale prefix is added to the URL.
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard\/catalog$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(
    page.getByRole("heading", {name: "Catalogue", level: 1}),
  ).toBeVisible();

  const cookies = await page.context().cookies();
  expect(cookies.find((cookie) => cookie.name === "NEXT_LOCALE")?.value).toBe(
    "fr",
  );

  // Switching back restores English in place.
  await page.getByRole("radio", {name: "English"}).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", {name: "Catalog", level: 1}),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard\/catalog$/);
});
