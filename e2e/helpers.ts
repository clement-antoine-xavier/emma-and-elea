import type {Page} from "@playwright/test";

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
