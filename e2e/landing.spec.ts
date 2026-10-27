import { expect, test } from "@playwright/test";

const baseURL = "http://localhost:3000";

async function useFrenchCookie(page: import("@playwright/test").Page) {
  await page.context().addCookies([
    { name: "NEXT_LOCALE", value: "fr", url: baseURL },
  ]);
}

test.describe("landing page", () => {
  test("renders the English hero and sends visitors to sign up", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "Produce just right. Sell better.",
        level: 1,
      }),
    ).toBeVisible();

    const hero = page.locator("#top");
    const primary = hero.getByRole("link", { name: "Create your account" });
    await expect(primary).toHaveAttribute("href", /\/sign-up$/);

    await page
      .getByRole("navigation", { name: "Emma & Éléa navigation" })
      .getByRole("link", { name: "Product" })
      .click();

    await expect(page).toHaveURL(/#product$/);
    await expect(page.locator("#product")).toBeVisible();
  });

  test("serves the French landing page from the locale cookie", async ({
    page,
  }) => {
    await useFrenchCookie(page);
    await page.goto("/");

    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(
      page.getByRole("heading", {
        name: "Produire juste. Vendre mieux.",
        level: 1,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Créer votre compte" }).first(),
    ).toHaveAttribute("href", /\/sign-up$/);
    await expect(page.getByText("Le quotidien").first()).toBeVisible();
  });

  test.describe("mobile navigation", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("opens the drawer and closes it after choosing a section", async ({
      page,
    }) => {
      await page.goto("/");

      await page.getByRole("button", { name: "Open navigation" }).click();

      const drawer = page.getByRole("dialog");
      await expect(drawer.getByRole("link", { name: "Benefits" })).toBeVisible();

      await drawer.getByRole("link", { name: "Benefits" }).click();

      await expect(page).toHaveURL(/#benefits$/);
      await expect(drawer).not.toBeVisible();
    });
  });
});
