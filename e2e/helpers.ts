import {expect, type Locator, type Page} from "@playwright/test";

export type SignUpOptions = {
  name: string;
  email: string;
  password: string;
};

export type WorkspaceOptions = {
  businessName: string;
  slug: string;
  siteName?: string;
  siteCode?: string;
};

/** Create an account and stop on the onboarding screen. */
export async function signUp(page: Page, options: SignUpOptions) {
  await gotoHydrated(page, "/sign-up");
  await page.getByLabel("Name").fill(options.name);
  await page.getByLabel("Email").fill(options.email);
  await page.getByLabel("Password").fill(options.password);
  await page.getByRole("button", {name: "Create account"}).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}

/** Complete onboarding and stop on the dashboard. */
export async function createWorkspace(page: Page, options: WorkspaceOptions) {
  await page.getByLabel("Business name").fill(options.businessName);
  await page.getByLabel("Workspace address").fill(options.slug);
  if (options.siteName) await page.getByLabel("Site name").fill(options.siteName);
  if (options.siteCode) await page.getByLabel("Site code").fill(options.siteCode);
  await page.getByRole("button", {name: "Create workspace"}).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** The sign-up + onboarding flow most feature specs need. */
export async function signUpAndCreateWorkspace(
  page: Page,
  options: SignUpOptions & WorkspaceOptions,
) {
  await signUp(page, options);
  await createWorkspace(page, options);
}

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
