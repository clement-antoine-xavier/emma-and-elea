import {createOrganizationSchema} from "@/server/validators/organization.schema";

const t = (key: string) => key;

describe("createOrganizationSchema", () => {
  const schema = createOrganizationSchema(t);
  const site = {siteName: "Atelier", siteCode: "atl"};

  it("accepts a normal name, slug and site", () => {
    const parsed = schema.safeParse({
      name: "Maison Éléa",
      slug: "maison-elea",
      ...site,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.siteCode).toBe("ATL");
    }
  });

  it("rejects an invalid slug", () => {
    for (const slug of ["Maison", "maison_elea", "-maison", "maison-", "a"]) {
      expect(
        schema.safeParse({name: "Maison", slug, ...site}).success,
      ).toBe(false);
    }
  });

  it("rejects an empty name or site name", () => {
    expect(
      schema.safeParse({name: " ", slug: "maison-elea", ...site}).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        name: "Maison",
        slug: "maison-elea",
        siteName: " ",
        siteCode: "ATL",
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid site code", () => {
    for (const siteCode of ["A", "AT-L", "ATELIER12", "éé"]) {
      expect(
        schema.safeParse({
          name: "Maison",
          slug: "maison-elea",
          siteName: "Atelier",
          siteCode,
        }).success,
      ).toBe(false);
    }
  });
});
