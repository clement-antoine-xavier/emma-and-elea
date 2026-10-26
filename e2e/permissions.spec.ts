import { expect, test } from "@playwright/test";
import {
  deleteOrganizationBySlug,
  deleteUserByEmail,
  pendingInvitationId,
} from "./db";
import {gotoHydrated} from "./helpers";

const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const ownerEmail = `e2e-owner-${unique}@example.com`;
const staffEmail = `e2e-staff-${unique}@example.com`;
const password = "password12345";
const slug = `e2e-perm-${unique}`;

test.afterAll(async () => {
  await deleteOrganizationBySlug(slug);
  await deleteUserByEmail(ownerEmail);
  await deleteUserByEmail(staffEmail);
});

test("an owner invites staff, and staff cannot reach team management", async ({
  page,
}) => {
  // Owner signs up and creates the workspace.
  await gotoHydrated(page, "/en/sign-up");
  await page.getByLabel("Name").fill("Owner");
  await page.getByLabel("Email").fill(ownerEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/en\/onboarding$/);
  await page.getByLabel("Business name").fill("Permission Bakery");
  await page.getByLabel("Workspace address").fill(slug);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/en\/dashboard$/);

  // The owner sees the Team tab and invites a staff member.
  await page.getByRole("link", { name: "Team" }).click();
  await expect(page).toHaveURL(/\/en\/dashboard\/team$/);
  await page.getByRole("textbox", { name: /Email/ }).fill(staffEmail);
  await page.getByRole("button", { name: "Create invitation" }).click();
  await expect(page.getByText("Invitation created")).toBeVisible();

  await expect
    .poll(() => pendingInvitationId(staffEmail))
    .not.toBeNull();

  const invitationId = await pendingInvitationId(staffEmail);
  expect(invitationId).toBeTruthy();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/en\/sign-in$/);

  // Staff signs up, then accepts the invitation.
  await gotoHydrated(page, "/en/sign-up");
  await page.getByLabel("Name").fill("Staff");
  await page.getByLabel("Email").fill(staffEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/onboarding$/);

  await gotoHydrated(page, `/en/accept-invitation/${invitationId}`);
  await expect(
    page.getByRole("heading", { name: /Join Permission Bakery/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Accept invitation" }).click();

  await expect(page).toHaveURL(/\/en\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Hello, Staff" }),
  ).toBeVisible();
  await expect(page.getByText("Staff").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Team" })).toHaveCount(0);
  await expect(page.getByText("Costs and margins")).toHaveCount(0);

  // Direct navigation to a guarded route is refused by the server.
  const response = await page.goto("/en/dashboard/team");
  expect(response?.status()).toBe(404);
});
