import {expect, test} from "@playwright/test";
import {instant} from "@next/playwright";

test("the public pages render their shell before request data", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {name: "Produce just right. Sell better."}),
  ).toBeVisible();

  await instant(page, async () => {
    await page
      .getByRole("navigation", {name: "Emma & Éléa navigation"})
      .getByRole("link", {name: "Sign in"})
      .click();
    await page.waitForURL((url) => url.pathname === "/sign-in");
    await expect(
      page.getByRole("heading", {name: "Welcome back"}),
    ).toBeVisible();
  });
});
