import {prisma} from "@/lib/prisma";
import {catalogRepository} from "@/server/repositories/catalog.repository";
import type {ItemInput} from "@/server/repositories/catalog.repository";
import {
  createFixture,
  referenceUnits,
  uniqueCode,
  type Fixture,
} from "@/test-utils/integration/db";

function itemInput(overrides: Partial<ItemInput> = {}): ItemInput {
  return {
    categoryId: null,
    code: uniqueCode("ITEM").toUpperCase(),
    name: "Test item",
    description: null,
    type: "RAW_MATERIAL",
    stockUnitId: referenceUnits.kg,
    saleUnitId: null,
    salePrice: null,
    vatRate: "5.5",
    shelfLifeDays: null,
    minStockQuantity: null,
    parLevelQuantity: null,
    defaultChannel: "NONE",
    isPurchasable: true,
    isProduced: false,
    isSellable: false,
    ...overrides,
  };
}

describe("catalog repository", () => {
  let fixture: Fixture;
  let otherOrganizationId: string;

  beforeAll(async () => {
    fixture = await createFixture();
    otherOrganizationId = `org_other_${Date.now()}`;
    await prisma.organization.create({
      data: {
        id: otherOrganizationId,
        name: "Other bakery",
        slug: `other-${Date.now()}`,
        createdAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({where: {id: otherOrganizationId}});
    await fixture.cleanup();
  });

  it("creates an item and reads its detail with the category", async () => {
    const input = itemInput({
      categoryId: fixture.categoryId,
      name: "Rye flour",
      description: "Stone ground",
      minStockQuantity: "5",
      parLevelQuantity: "20",
    });
    const id = await catalogRepository.createItem(
      fixture.organizationId,
      input,
    );

    const detail = await catalogRepository.findItem(
      fixture.organizationId,
      id,
    );

    expect(detail).toMatchObject({
      id,
      code: input.code,
      name: "Rye flour",
      description: "Stone ground",
      categoryId: fixture.categoryId,
      categoryName: "Raw materials",
      stockUnitCode: "kg",
      minStockQuantity: "5",
      parLevelQuantity: "20",
      isArchived: false,
    });
  });

  it("updates only the owning tenant", async () => {
    const id = await catalogRepository.createItem(
      fixture.organizationId,
      itemInput({name: "Oat flour"}),
    );

    await expect(
      catalogRepository.updateItem(otherOrganizationId, id, {
        ...itemInput(),
        name: "Hijacked",
      }),
    ).resolves.toBe(false);
    await expect(
      catalogRepository.archiveItem(otherOrganizationId, id),
    ).resolves.toBe(false);
    await expect(
      catalogRepository.findItem(otherOrganizationId, id),
    ).resolves.toBeNull();

    await expect(
      catalogRepository.updateItem(fixture.organizationId, id, {
        ...itemInput(),
        name: "Oat flour v2",
      }),
    ).resolves.toBe(true);
    await expect(
      catalogRepository.findItem(fixture.organizationId, id),
    ).resolves.toMatchObject({name: "Oat flour v2"});
  });

  it("searches by name or code, filters by type and paginates", async () => {
    await catalogRepository.createItem(
      fixture.organizationId,
      itemInput({code: "SEARCH-A", name: "Sesame seeds"}),
    );
    await catalogRepository.createItem(
      fixture.organizationId,
      itemInput({
        code: "SEARCH-B",
        name: "Sesame paste",
        type: "SEMI_FINISHED",
      }),
    );

    const byName = await catalogRepository.listItems(fixture.organizationId, {
      search: "sesame",
      type: null,
      categoryId: null,
      includeArchived: false,
      skip: 0,
      take: 25,
    });
    expect(byName.total).toBeGreaterThanOrEqual(2);

    const byCode = await catalogRepository.listItems(fixture.organizationId, {
      search: "search-a",
      type: null,
      categoryId: null,
      includeArchived: false,
      skip: 0,
      take: 25,
    });
    expect(byCode.items.map((item) => item.code)).toEqual(["SEARCH-A"]);

    const typed = await catalogRepository.listItems(fixture.organizationId, {
      search: "",
      type: "SEMI_FINISHED",
      categoryId: null,
      includeArchived: false,
      skip: 0,
      take: 25,
    });
    expect(typed.items.every((item) => item.type === "SEMI_FINISHED")).toBe(
      true,
    );

    const page = await catalogRepository.listItems(fixture.organizationId, {
      search: "",
      type: null,
      categoryId: null,
      includeArchived: false,
      skip: 1,
      take: 1,
    });
    expect(page.items).toHaveLength(1);
    expect(page.total).toBeGreaterThan(1);
  });

  it("hides archived items unless they are requested", async () => {
    const id = await catalogRepository.createItem(
      fixture.organizationId,
      itemInput({name: "Archived item", code: "ARCHIVED-IT"}),
    );
    await expect(
      catalogRepository.archiveItem(fixture.organizationId, id),
    ).resolves.toBe(true);
    await expect(
      catalogRepository.archiveItem(fixture.organizationId, id),
    ).resolves.toBe(false);

    const active = await catalogRepository.listItems(fixture.organizationId, {
      search: "Archived item",
      type: null,
      categoryId: null,
      includeArchived: false,
      skip: 0,
      take: 25,
    });
    expect(active.items).toHaveLength(0);

    const all = await catalogRepository.listItems(fixture.organizationId, {
      search: "Archived item",
      type: null,
      categoryId: null,
      includeArchived: true,
      skip: 0,
      take: 25,
    });
    expect(all.items[0]).toMatchObject({id, isArchived: true});
  });

  it("lists active item options for the tenant only", async () => {
    const options = await catalogRepository.listItemOptions(
      fixture.organizationId,
    );

    expect(options.some((item) => item.id === fixture.items.flour)).toBe(true);
    expect(options.every((item) => item.code !== "ARCHIVED-IT")).toBe(true);

    await catalogRepository.createItem(
      otherOrganizationId,
      itemInput({code: "OTHER-ONLY"}),
    );
    const other = await catalogRepository.listItemOptions(otherOrganizationId);
    expect(other.map((item) => item.code)).toEqual(["OTHER-ONLY"]);
  });

  it("creates categories and reports parent, item and child counts", async () => {
    const parentId = await catalogRepository.createCategory(
      fixture.organizationId,
      {name: "Bakery", parentId: null, sortOrder: 2},
    );
    const childId = await catalogRepository.createCategory(
      fixture.organizationId,
      {name: "Viennoiserie", parentId, sortOrder: 1},
    );
    await catalogRepository.createItem(
      fixture.organizationId,
      itemInput({categoryId: childId}),
    );

    const categories = await catalogRepository.listCategories(
      fixture.organizationId,
    );
    const parent = categories.find((category) => category.id === parentId);
    const child = categories.find((category) => category.id === childId);

    expect(parent).toMatchObject({parentId: null, childCount: 1});
    expect(child).toMatchObject({parentId, parentName: "Bakery", itemCount: 1});
    await expect(
      catalogRepository.findCategory(fixture.organizationId, childId),
    ).resolves.toEqual({id: childId, parentId});

    await expect(
      catalogRepository.archiveCategory(fixture.organizationId, childId),
    ).resolves.toBe(true);
    await expect(
      catalogRepository.archiveCategory(fixture.organizationId, childId),
    ).resolves.toBe(false);
  });

  it("sets and removes an item allergen", async () => {
    await catalogRepository.setItemAllergen(fixture.organizationId, {
      itemId: fixture.items.flour,
      allergenId: "allergen_gluten",
      presence: "CONTAINS",
      note: "Milled in-house",
    });

    const withAllergen = await catalogRepository.findItem(
      fixture.organizationId,
      fixture.items.flour,
    );
    const link = withAllergen?.allergens.find(
      (allergen) => allergen.allergenId === "allergen_gluten",
    );
    expect(link).toMatchObject({
      presence: "CONTAINS",
      note: "Milled in-house",
    });

    await expect(
      catalogRepository.removeItemAllergen(fixture.organizationId, link!.id),
    ).resolves.toBe(true);
    await expect(
      catalogRepository.removeItemAllergen(fixture.organizationId, link!.id),
    ).resolves.toBe(false);
  });

  it("reads units and allergens from the reference tables", async () => {
    const units = await catalogRepository.listUnits();
    const allergens = await catalogRepository.listAllergens();

    expect(units.map((unit) => unit.code)).toEqual(
      expect.arrayContaining(["kg", "g", "L", "piece"]),
    );
    expect(allergens.map((allergen) => allergen.code)).toContain("GLUTEN");
    await expect(catalogRepository.findUnit("unit_kg")).resolves.toMatchObject({
      kind: "MASS",
      isBase: true,
    });
    await expect(catalogRepository.findUnit("missing")).resolves.toBeNull();
  });
});
