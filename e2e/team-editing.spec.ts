import {expect, test} from "@playwright/test";
import {deleteOrganizationBySlug, deleteUserByEmail} from "./db";
import {clickNav, gotoHydrated, signUpAndCreateWorkspace} from "./helpers";

function nextMonday(): Date {
  const today = new Date();
  const date = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const weekday = date.getUTCDay();
  const offset = weekday === 1 ? 7 : (8 - weekday) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
}

const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-team-edit-${unique}@example.com`;
const inviteeEmail = `e2e-team-invitee-${unique}@example.com`;
const password = "password12345";
const slug = `e2e-team-edit-${unique}`;

test.afterAll(async () => {
  await deleteOrganizationBySlug(slug);
  await deleteUserByEmail(email);
});

test("cancels invitations, edits employees and removes shifts", async ({
  page,
}) => {
  await signUpAndCreateWorkspace(page, {
    name: "Team Editor",
    email,
    password,
    businessName: "Team Bakery",
    slug,
    siteCode: "TEM",
  });

  // Invite then cancel before the colleague accepts.
  await clickNav(page, "Team", "/dashboard/team");
  await page.getByRole("textbox", {name: /Email/}).fill(inviteeEmail);
  await page.getByRole("button", {name: "Create invitation"}).click();
  await expect(page.getByText("Invitation created")).toBeVisible();
  await expect(page.getByText(inviteeEmail).first()).toBeVisible();

  await page.getByRole("button", {name: "Cancel", exact: true}).first().click();
  await expect(page.getByText("No pending invitations.")).toBeVisible();

  // Create an employee profile and rename it.
  await page.getByRole("link", {name: "Employees"}).click();
  await page.getByRole("button", {name: "Add an employee profile"}).click();
  await page.getByLabel("Job title").fill("Baker");
  await page.getByLabel("Weekly contract hours").fill("35");
  await page.getByRole("button", {name: "Create profile"}).click();
  await expect(page).toHaveURL(/\/dashboard\/team\/employees\//);

  const editEmployeeForm = page
    .locator("form")
    .filter({has: page.getByRole("button", {name: "Save employee"})});
  await editEmployeeForm.getByLabel("Job title").fill("Head baker");
  await page.getByRole("button", {name: "Save employee"}).click();
  await expect(page.getByText("Employee updated")).toBeVisible();

  // Create a shift, then remove it through the confirmation dialog.
  await clickNav(page, "Team", "/dashboard/team");
  await page.getByRole("link", {name: "Schedule"}).first().click();
  const monday = nextMonday();
  const mondayIso = monday.toISOString().slice(0, 10);
  await page.getByLabel("Week", {exact: true}).fill(mondayIso);
  await page.getByRole("button", {name: "Show"}).click();

  const shiftForm = page
    .locator("form")
    .filter({has: page.getByRole("button", {name: "Create shift"})});
  await shiftForm.getByPlaceholder("Select a date").nth(0).fill(mondayIso);
  await page.getByLabel("Starts time").fill("09:00");
  await shiftForm.getByPlaceholder("Select a date").nth(1).fill(mondayIso);
  await page.getByLabel("Ends time").fill("12:00");
  await page.getByRole("button", {name: "Create shift"}).click();

  const shiftRow = page.getByRole("row", {name: /Team Bakery/}).first();
  await expect(shiftRow).toBeVisible();
  await shiftRow.getByRole("button", {name: "Remove"}).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", {name: "Remove shift"})
    .click();
  await expect(
    page.getByText("Create a shift to start building the rota."),
  ).toBeVisible();

  // Reaching the page signed out is refused.
  await page.getByRole("button", {name: "Sign out"}).click();
  await gotoHydrated(page, "/sign-in");
  await page.goto("/dashboard/team/schedule");
  await expect(page).toHaveURL(/\/sign-in$/);
});
