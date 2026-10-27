import {expect, test} from "@playwright/test";
import {deleteOrganizationBySlug, deleteUserByEmail} from "./db";
import {gotoHydrated, signUpAndCreateWorkspace} from "./helpers";

const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const ownerEmail = `e2e-security-owner-${unique}@example.com`;
const otherEmail = `e2e-security-other-${unique}@example.com`;
const password = "password12345";
const ownerSlug = `e2e-security-owner-${unique}`;
const otherSlug = `e2e-security-other-${unique}`;

test.afterAll(async () => {
  await deleteOrganizationBySlug(otherSlug);
  await deleteOrganizationBySlug(ownerSlug);
  await deleteUserByEmail(otherEmail);
  await deleteUserByEmail(ownerEmail);
});

test("guards routes, invitations and tenant boundaries", async ({page}) => {
  // A signed-out visitor is sent to sign-in.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in$/);

  // Unknown routes and malformed invitations render the 404 page.
  await page.goto("/this-route-does-not-exist");
  await expect(
    page.getByText("This page could not be found."),
  ).toBeVisible();
  await gotoHydrated(page, "/accept-invitation/not-a-real-invitation");
  await expect(
    page.getByText("This page could not be found."),
  ).toBeVisible();

  // Owner A creates an item and keeps its private URL.
  await signUpAndCreateWorkspace(page, {
    name: "Owner A",
    email: ownerEmail,
    password,
    businessName: "Owner A Bakery",
    slug: ownerSlug,
    siteCode: "OWN",
  });
  await page.getByRole("link", {name: "Catalog", exact: true}).click();
  await page.getByRole("link", {name: "New item"}).click();
  const itemForm = page
    .locator("form")
    .filter({has: page.getByRole("button", {name: "Create item"})});
  await itemForm.getByLabel("Name").fill("Private flour");
  await itemForm.getByLabel("Code").fill("PRIVATE");
  await page.getByRole("button", {name: "Create item"}).click();
  await expect(
    page.getByRole("heading", {name: "Private flour", level: 1}),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/\/items\/new$/);
  const privateItemUrl = page.url();

  // Owner B is a separate tenant and cannot read A's record by URL.
  await page.getByRole("button", {name: "Sign out"}).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await signUpAndCreateWorkspace(page, {
    name: "Owner B",
    email: otherEmail,
    password,
    businessName: "Owner B Bakery",
    slug: otherSlug,
    siteCode: "OTH",
  });

  await page.goto(privateItemUrl);
  await expect(
    page.getByText("This page could not be found."),
  ).toBeVisible();

  // A's data is still intact for A.
  await page.goto("/dashboard");
  await page.getByRole("button", {name: "Sign out"}).click();
  await gotoHydrated(page, "/sign-in");
  await page.getByLabel("Email").fill(ownerEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", {name: "Sign in"}).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto(privateItemUrl);
  await expect(
    page.getByRole("heading", {name: "Private flour"}),
  ).toBeVisible();
});
