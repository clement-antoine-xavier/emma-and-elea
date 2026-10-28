import {expect, test} from "@playwright/test";
import {deleteOrganizationBySlug, deleteUserByEmail} from "./db";
import {signUpAndCreateWorkspace} from "./helpers";

const enabled = process.env.ASSISTANT_ENABLED === "true";
const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-assistant-${unique}@example.com`;
const password = "password12345";
const slug = `e2e-assistant-${unique}`;

test.skip(!enabled, "The assistant is disabled in this environment.");

test.afterAll(async () => {
  await deleteOrganizationBySlug(slug);
  await deleteUserByEmail(email);
});

test("the assistant pages open for both personas", async ({page}) => {
  await signUpAndCreateWorkspace(page, {
    name: "Assistant Owner",
    email,
    password,
    businessName: "Assistant Bakery",
    slug,
    siteName: "Atelier Assistant",
    siteCode: "AST",
  });

  await page.getByRole("link", {name: "Assistant", exact: true}).click();
  await expect(
    page.getByRole("heading", {name: "Where should we start?"}),
  ).toBeVisible();
  await expect(page.getByText("I look after customers, orders")).toBeVisible();

  await page.getByRole("radio", {name: "Éléa"}).click();
  await expect(
    page.getByText("I look after production, stock, purchasing"),
  ).toBeVisible();

  await page.getByRole("radio", {name: "Emma"}).click();
  await expect(page.getByText("I look after customers, orders")).toBeVisible();

  const sendMessage =
    process.env.ASSISTANT_FAKE_MODEL === "echo" ||
    process.env.ASSISTANT_LIVE_TEST === "1";

  if (!sendMessage) return;

  const prompt =
    process.env.ASSISTANT_FAKE_MODEL === "echo"
      ? "What should I look at today?"
      : "Use the whoami tool and reply with my organization role only.";

  await page.getByRole("textbox", {name: "Message input"}).fill(prompt);
  await page.getByRole("button", {name: "Send"}).click();

  if (process.env.ASSISTANT_FAKE_MODEL === "echo") {
    await expect(
      page.getByText("Test reply from the assistant."),
    ).toBeVisible();
  } else {
    await expect(page.getByRole("log")).toContainText(/owner/i, {
      timeout: 30_000,
    });
  }

  await expect(page).toHaveURL(/\/dashboard\/assistant\/[^/]+$/);

  await page.getByRole("button", {name: "New chat"}).click();
  await expect(
    page.getByRole("heading", {name: "Where should we start?"}),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard\/assistant$/);

  await page.getByRole("link", {name: prompt}).click();
  await expect(page.getByRole("log")).toContainText(prompt);
});
