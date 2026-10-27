import { expect, test } from "@playwright/test";

test.describe("theme and language preferences", () => {
  test("persists the selected theme across reloads", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("radio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("radio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("switches language without losing the theme or changing the URL", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    await page.getByRole("radio", { name: "Dark" }).click();
    await page.getByRole("radio", { name: "Français" }).click();

    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(
      page.getByRole("heading", { name: "Content de vous revoir" }),
    ).toBeVisible();

    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === "NEXT_LOCALE")?.value).toBe(
      "fr",
    );

    await page.reload();

    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(
      page.getByRole("heading", { name: "Content de vous revoir" }),
    ).toBeVisible();
  });

  test("returns to the system preference", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("radio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.getByRole("radio", { name: "System" }).click();

    await expect(page.locator("html")).not.toHaveAttribute(
      "data-theme",
      "dark",
    );
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-theme",
      "light",
    );
  });
});
