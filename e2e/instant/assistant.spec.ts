import {expect, test} from "@playwright/test";
import {instant} from "@next/playwright";
import {deleteOrganizationBySlug, deleteUserByEmail} from "../db";
import {signUpAndCreateWorkspace} from "../helpers";

const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-instant-${unique}@example.com`;
const password = "password12345";
const slug = `e2e-instant-${unique}`;

test.afterAll(async () => {
  await deleteOrganizationBySlug(slug);
  await deleteUserByEmail(email);
});

test("opening a recent assistant conversation keeps the shell", async ({
  page,
}) => {
  await signUpAndCreateWorkspace(page, {
    name: "Instant Owner",
    email,
    password,
    businessName: "Instant Bakery",
    slug,
    siteName: "Instant Atelier",
    siteCode: "INS",
  });

  await page.getByRole("link", {name: "Assistant", exact: true}).click();
  await page.getByRole("textbox", {name: "Message input"}).fill("Instant prompt");
  await page.getByRole("button", {name: "Send"}).click();
  await expect(page.getByText("Test reply from the assistant.")).toBeVisible();

  await page.getByRole("button", {name: "New chat"}).click();
  await expect(
    page.getByRole("heading", {name: "Where should we start?"}),
  ).toBeVisible();

  await instant(page, async () => {
    await page.getByRole("button", {name: /Instant prompt/}).click();
    await page.waitForURL((url) =>
      /\/dashboard\/assistant\/[^/]+$/.test(url.pathname),
    );

    // The dashboard chrome and the assistant fallback are in the initial UI.
    await expect(
      page.getByRole("link", {name: "Assistant", exact: true}),
    ).toBeVisible();
    await expect(page.getByTestId("assistant-loading")).toBeVisible();
  });

  await expect(page.getByRole("log")).toContainText("Instant prompt", {
    timeout: 20_000,
  });
});
