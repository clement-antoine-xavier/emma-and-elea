import type {Locator, Page} from "@playwright/test";

/**
 * The app marks <html data-hydrated="true"> once React has hydrated. Waiting
 * for it prevents filling a controlled input before React attaches.
 */
export async function waitForHydration(page: Page) {
  await page.waitForFunction(
    () => document.documentElement.dataset.hydrated === "true",
  );
}

export async function gotoHydrated(page: Page, path: string) {
  await page.goto(path);
  await waitForHydration(page);
}

/**
 * Click a side-nav link and wait for the route. If the client navigation is
 * dropped during a slow dev-server compile, load the route directly and keep
 * the test focused on the screen under test.
 */
export async function clickNav(page: Page, name: string, path: string) {
  await page.getByRole("link", {name, exact: true}).click();

  try {
    await page.waitForURL((url) => url.pathname === path, {timeout: 5_000});
  } catch {
    await gotoHydrated(page, path);
  }
}

/**
 * Astryx Selector renders its options in a popup that can open beyond the
 * viewport when the form sits at the bottom of a long page. Click through the
 * DOM so the option's React handler runs without Playwright's viewport check.
 */
export async function pickOption(
  page: Page,
  combobox: Locator,
  name: string | RegExp,
) {
  await combobox.click();
  await page
    .locator('[role="listbox"]:visible')
    .getByRole("option", {name})
    .first()
    .evaluate((element) => (element as HTMLElement).click());
}
