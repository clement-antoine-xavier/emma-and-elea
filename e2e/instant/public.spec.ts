import {expect, test} from "@playwright/test";

test("the public pages render their shell", async ({page}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {name: "Produce just right. Sell better."}),
  ).toBeVisible();

  // The sign-in route still resolves its locale metadata on the server, so
  // assert the client navigation normally rather than holding dynamic data.
  await page
    .getByRole("navigation", {name: "Emma & Éléa navigation"})
    .getByRole("link", {name: "Sign in"})
    .click();
  await page.waitForURL((url) => url.pathname === "/sign-in");
  await expect(page.getByRole("heading", {name: "Welcome back"})).toBeVisible();
});
