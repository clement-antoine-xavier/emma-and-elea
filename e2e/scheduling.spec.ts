import { expect, test } from "@playwright/test";
import { deleteOrganizationBySlug, deleteUserByEmail } from "./db";
import { clickNav, gotoHydrated } from "./helpers";

const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-schedule-${unique}@example.com`;
const password = "password12345";
const slug = `e2e-schedule-${unique}`;

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

test.afterAll(async () => {
  await deleteOrganizationBySlug(slug);
  await deleteUserByEmail(email);
});

test("an employee profile, availability and shift assignment work together", async ({
  page,
}) => {
  await gotoHydrated(page, "/sign-up");
  await page.getByLabel("Name").fill("Schedule Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByLabel("Business name").fill("Schedule Bakery");
  await page.getByLabel("Workspace address").fill(slug);
  await page.getByLabel("Site code").fill("SCH");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await clickNav(page, "Team", "/dashboard/team");
  await page.getByRole("link", { name: "Employees" }).click();
  await page.getByRole("button", { name: "Add an employee profile" }).click();
  const employeeForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create profile" }) });
  await employeeForm.getByLabel("Job title").fill("Head baker");
  await employeeForm.getByLabel("Weekly contract hours").fill("35");
  await page.getByRole("button", { name: "Create profile" }).click();
  await expect(page).toHaveURL(/\/dashboard\/team\/employees\//);

  await page.getByRole("button", { name: "Add window" }).click();
  await expect(page.getByText("08:00 – 16:00").first()).toBeVisible();

  await clickNav(page, "Team", "/dashboard/team");
  await page.getByRole("link", { name: "Schedule" }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/team\/schedule$/);

  const monday = nextMonday();
  const mondayIso = monday.toISOString().slice(0, 10);
  await page.getByLabel("Week", { exact: true }).fill(mondayIso);
  await page.getByRole("button", { name: "Show" }).click();

  const shiftForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create shift" }) });
  await shiftForm
    .getByPlaceholder("Select a date")
    .nth(0)
    .fill(mondayIso);
  await page.getByLabel("Starts time").fill("09:00");
  await shiftForm
    .getByPlaceholder("Select a date")
    .nth(1)
    .fill(mondayIso);
  await page.getByLabel("Ends time").fill("13:00");
  await page.getByRole("button", { name: "Create shift" }).click();
  const shiftRow = page
    .getByRole("row", { name: /Schedule Bakery/ })
    .first();
  await expect(shiftRow).toBeVisible();

  await page.getByRole("button", { name: "Assign employee" }).click();
  await expect(shiftRow.getByText("Schedule Owner")).toBeVisible();
  await expect(shiftRow.getByText("Unassigned")).toHaveCount(0);

  await page.getByRole("link", { name: "Absences" }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/team\/absences$/);
  const absenceForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Record absence" }) });
  const absenceDate = new Date(monday);
  absenceDate.setUTCDate(absenceDate.getUTCDate() + 1);
  const absenceIso = absenceDate.toISOString().slice(0, 10);
  await absenceForm
    .getByPlaceholder("Select a date")
    .nth(0)
    .fill(absenceIso);
  await absenceForm.getByLabel("Starts time").fill("09:00");
  await absenceForm
    .getByPlaceholder("Select a date")
    .nth(1)
    .fill(absenceIso);
  await absenceForm.getByLabel("Ends time").fill("17:00");
  await page.getByRole("button", { name: "Record absence" }).click();
  await expect(page.getByText("Requested").first()).toBeVisible();

  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Approved").first()).toBeVisible();
});
