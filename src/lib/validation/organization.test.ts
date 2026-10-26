import {
  createOrganizationSchema,
  inviteMemberSchema,
  slugifyOrganizationName,
} from "@/lib/validation/organization";

const tName = (key: string) => key;
const tMember = (key: string) => key;

describe("slugifyOrganizationName", () => {
  it("lowercases, strips accents and collapses separators", () => {
    expect(slugifyOrganizationName("Boulangerie Éléa & Fils")).toBe(
      "boulangerie-elea-fils",
    );
    expect(slugifyOrganizationName("  L'Atelier — Nord  ")).toBe(
      "l-atelier-nord",
    );
  });

  it("keeps a slug within the database-friendly length", () => {
    expect(slugifyOrganizationName("a".repeat(80))).toHaveLength(60);
  });
});

describe("createOrganizationSchema", () => {
  const schema = createOrganizationSchema(tName);

  it("accepts a normal name and slug", () => {
    expect(
      schema.safeParse({name: "Maison Éléa", slug: "maison-elea"}).success,
    ).toBe(true);
  });

  it("rejects an invalid slug", () => {
    for (const slug of ["Maison", "maison_elea", "-maison", "maison-", "a"]) {
      expect(schema.safeParse({name: "Maison", slug}).success).toBe(false);
    }
  });

  it("rejects an empty name", () => {
    expect(
      schema.safeParse({name: " ", slug: "maison-elea"}).success,
    ).toBe(false);
  });
});

describe("inviteMemberSchema", () => {
  const schema = inviteMemberSchema(tMember);

  it("accepts an active role", () => {
    expect(
      schema.safeParse({email: "team@example.com", role: "staff"}).success,
    ).toBe(true);
  });

  it("rejects reserved roles and unknown roles", () => {
    for (const role of ["accountant", "auditor", "member", "superuser"]) {
      expect(
        schema.safeParse({email: "team@example.com", role}).success,
      ).toBe(false);
    }
  });

  it("rejects an invalid email", () => {
    expect(schema.safeParse({email: "nope", role: "staff"}).success).toBe(
      false,
    );
  });
});
