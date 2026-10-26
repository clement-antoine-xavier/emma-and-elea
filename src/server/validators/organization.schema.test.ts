import {createOrganizationSchema} from "@/server/validators/organization.schema";

const t = (key: string) => key;

describe("createOrganizationSchema", () => {
  const schema = createOrganizationSchema(t);

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
