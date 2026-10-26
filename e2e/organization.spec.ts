import { expect, test } from "@playwright/test";
import {
  deleteOrganizationBySlug,
  deleteUserByEmail,
  organizationDefaults,
} from "./db";

const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e-org-${unique}@example.com`;
const password = "password12345";
const slug = `e2e-org-${unique}`;

test.afterAll(async () => {
  await deleteOrganizationBySlug(slug);
  await deleteUserByEmail(email);
});

test("bootstraps settings and loss reasons with a new organization", async ({
  request,
  baseURL,
}) => {
  // Better Auth rejects state-changing requests without an Origin header.
  const headers = { origin: baseURL ?? "http://localhost:3000" };

  const signUp = await request.post("/api/auth/sign-up/email", {
    headers,
    data: { email, password, name: "E2E Org" },
  });
  expect(signUp.ok()).toBeTruthy();

  const created = await request.post("/api/auth/organization/create", {
    headers,
    data: { name: "E2E Bakery", slug },
  });
  expect(created.ok()).toBeTruthy();

  const organization = (await created.json()) as { id: string };
  expect(organization.id).toBeTruthy();

  await expect
    .poll(() => organizationDefaults(organization.id))
    .toEqual({ settings: 1, lossReasons: 8 });
});
