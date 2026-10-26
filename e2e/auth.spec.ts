import { expect, test } from "@playwright/test";
import { deleteUserByEmail, userExists } from "./db";

const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
const password = "password12345";
const name = "E2E User";

test.afterAll(async () => {
  await deleteUserByEmail(email);
});

test("signs up, persists to Postgres, signs out, and signs back in", async ({
  page,
}) => {
  await deleteUserByEmail(email);

  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(`Signed in as ${name}`)).toBeVisible();
  await expect.poll(() => userExists(email)).toBe(true);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(`Signed in as ${name}`)).toBeVisible();
});

test("shows client-side validation errors", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Enter your name.").first()).toBeVisible();
  await expect(
    page.getByText("Enter a valid email address.").first(),
  ).toBeVisible();
  await expect(
    page.getByText("Use at least 8 characters.").first(),
  ).toBeVisible();
});
