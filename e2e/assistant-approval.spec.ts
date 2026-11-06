import {expect, test} from "@playwright/test";
import {
  deleteOrganizationBySlug,
  deleteUserByEmail,
  expireApprovalsForConversation,
} from "./db";
import {signUpAndCreateWorkspace} from "./helpers";

const enabled = process.env.ASSISTANT_ENABLED === "true";
const approvalModel = process.env.ASSISTANT_FAKE_MODEL === "approval";
const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-approval-${unique}@example.com`;
const password = "password12345";
const slug = `e2e-approval-${unique}`;

test.skip(!enabled, "The assistant is disabled in this environment.");
test.skip(
  !approvalModel,
  "Run with ASSISTANT_FAKE_MODEL=approval to exercise approvals.",
);

test.afterAll(async () => {
  await deleteOrganizationBySlug(slug);
  await deleteUserByEmail(email);
});

async function requestApproval(page: import("@playwright/test").Page) {
  const panel = page.locator(".assistant-review-panel");

  await page.getByRole("textbox", {name: "Message input"}).fill("Cancel it");
  await page.getByRole("button", {name: "Send"}).click();
  await expect(panel.getByText("Approval required")).toBeVisible({
    timeout: 20_000,
  });

  return panel;
}

async function newChat(page: import("@playwright/test").Page) {
  await page.getByRole("button", {name: "New chat"}).click();
  await expect(
    page.getByRole("heading", {name: "Where should we start?"}),
  ).toBeVisible();
}

test("@slow approvals can be approved, rejected, reloaded and expired", async ({
  page,
}) => {
  await signUpAndCreateWorkspace(page, {
    name: "Approval Owner",
    email,
    password,
    businessName: "Approval Bakery",
    slug,
    siteName: "Approval Atelier",
    siteCode: "APR",
  });

  await page.getByRole("link", {name: "Assistant", exact: true}).click();

  // Approving runs the gated tool once and lets the model answer.
  const approvedPanel = await requestApproval(page);
  await approvedPanel.getByRole("button", {name: "Approve"}).click();
  await expect(page.getByText("The order was not changed.")).toBeVisible({
    timeout: 20_000,
  });
  await expect(approvedPanel.getByText("Approval required")).toHaveCount(0);

  // Rejecting skips the tool and still lets the model answer.
  await newChat(page);
  const rejectedPanel = await requestApproval(page);
  await rejectedPanel.getByRole("button", {name: "Reject"}).click();
  await expect(page.getByText("The order was not changed.")).toBeVisible({
    timeout: 20_000,
  });
  await expect(rejectedPanel.getByText("Approval required")).toHaveCount(0);

  // A reload with a pending approval renders the card from the database.
  await newChat(page);
  await requestApproval(page);
  const conversationId = page.url().split("/").pop();
  expect(conversationId).toBeTruthy();

  await page.reload();
  const reloadedPanel = page.locator(".assistant-review-panel");
  await expect(reloadedPanel.getByText("Approval required")).toBeVisible({
    timeout: 20_000,
  });

  // An expired approval cannot be approved.
  await expireApprovalsForConversation(conversationId!);
  await reloadedPanel.getByRole("button", {name: "Approve"}).click();
  await expect(
    page.getByText(/APPROVAL_EXPIRED|expired/i).first(),
  ).toBeVisible({timeout: 20_000});
});
