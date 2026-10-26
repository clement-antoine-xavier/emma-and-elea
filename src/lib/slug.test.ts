import {slugifyOrganizationName} from "@/lib/slug";

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
