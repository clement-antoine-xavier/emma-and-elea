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

  await page.goto("/en/sign-up");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByText(`Signed in as ${name}`)).toBeVisible();
  await expect.poll(() => userExists(email)).toBe(true);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

  await page.goto("/en/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByText(`Signed in as ${name}`)).toBeVisible();
});

test("shows client-side validation errors", async ({ page }) => {
  await page.goto("/en/sign-up");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Enter your name.").first()).toBeVisible();
  await expect(
    page.getByText("Enter a valid email address.").first(),
  ).toBeVisible();
  await expect(
    page.getByText("Use at least 8 characters.").first(),
  ).toBeVisible();
});

test("serves a French locale with translated copy", async ({ page }) => {
  await page.goto("/fr/sign-up");

  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(
    page.getByRole("heading", { name: "Créez votre compte" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Créer un compte" }).click();

  await expect(page.getByText("Saisissez votre nom.").first()).toBeVisible();
  await expect(
    page.getByText("Saisissez une adresse e-mail valide.").first(),
  ).toBeVisible();

  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/sign-up$/);
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
});

test("redirects the root path to a locale", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/(en|fr)$/);
});
