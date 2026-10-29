import {prisma} from "@/lib/prisma";
import {recipeRepository} from "@/server/repositories/recipe.repository";
import type {CostSnapshotInput} from "@/server/repositories/recipe.repository";
import {
  createFixture,
  referenceUnits,
  uniqueCode,
  type Fixture,
} from "@/test-utils/integration/db";

function snapshot(): CostSnapshotInput {
  return {
    currency: "EUR",
    materialCost: "1",
    packagingCost: "0",
    labourCost: "2",
    energyCost: "0.5",
    overheadCost: "0.35",
    totalCost: "3.85",
    yieldQuantity: "10",
    yieldUnitId: referenceUnits.piece,
    costPerUnit: "0.385",
    salePrice: "2.5",
    marginPct: "84.6",
    inputHash: null,
    lines: [
      {
        kind: "MATERIAL",
        itemId: null,
        lotId: null,
        recipeOperationId: null,
        label: "Flour",
        quantity: "1",
        unitId: referenceUnits.kg,
        unitCost: "1",
        amount: "1",
        position: 0,
      },
    ],
  };
}

describe("recipe repository", () => {
  let fixture: Fixture;

  beforeAll(async () => {
    fixture = await createFixture();
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  async function createRecipe() {
    return recipeRepository.createWithVersion(
      fixture.organizationId,
      {
        code: uniqueCode("REC").toUpperCase(),
        name: "Croissant",
        description: null,
        outputItemId: fixture.items.croissant,
      },
      referenceUnits.piece,
    );
  }

  it("creates a recipe with a draft version in the output unit", async () => {
    const {recipeId, versionId} = await createRecipe();

    const version = await recipeRepository.findVersion(
      fixture.organizationId,
      versionId,
    );
    expect(version).toMatchObject({
      recipeId,
      versionNumber: 1,
      status: "DRAFT",
      yieldQuantity: "1",
      yieldUnitId: referenceUnits.piece,
      outputItemId: fixture.items.croissant,
    });
    expect(version?.lines).toEqual([]);
  });

  it("adds and removes draft lines and operations with positions", async () => {
    const {versionId} = await createRecipe();

    await recipeRepository.addLine(fixture.organizationId, versionId, {
      itemId: fixture.items.flour,
      quantity: "1",
      unitId: referenceUnits.kg,
      lossPct: "0",
      isOptional: false,
      note: null,
    });
    await recipeRepository.addLine(fixture.organizationId, versionId, {
      itemId: fixture.items.butter,
      quantity: "0.2",
      unitId: referenceUnits.kg,
      lossPct: "5",
      isOptional: true,
      note: "For lamination",
    });
    await recipeRepository.addOperation(fixture.organizationId, versionId, {
      name: "Laminating",
      description: null,
      durationMinutes: 30,
      activeMinutes: 15,
      equipmentId: null,
      labourRateId: null,
      requiredSkillId: null,
    });

    const withContent = await recipeRepository.findVersion(
      fixture.organizationId,
      versionId,
    );
    expect(withContent?.lines.map((line) => line.position)).toEqual([1, 2]);
    expect(withContent?.operations.map((operation) => operation.position)).toEqual(
      [1],
    );

    await recipeRepository.removeLine(
      fixture.organizationId,
      versionId,
      withContent!.lines[1].id,
    );
    await recipeRepository.removeOperation(
      fixture.organizationId,
      versionId,
      withContent!.operations[0].id,
    );

    const emptied = await recipeRepository.findVersion(
      fixture.organizationId,
      versionId,
    );
    expect(emptied?.lines).toHaveLength(1);
    expect(emptied?.operations).toHaveLength(0);
  });

  it("updates a draft version and refuses a published one", async () => {
    const {versionId} = await createRecipe();
    const input = {
      yieldQuantity: "12",
      yieldUnitId: referenceUnits.piece,
      portionCount: 12,
      prepMinutes: 20,
      cookMinutes: 18,
      instructions: "Shape and proof.",
      changeNote: "Initial",
    };

    await expect(
      recipeRepository.updateVersion(fixture.organizationId, versionId, input),
    ).resolves.toBe(true);

    await recipeRepository.publish(
      fixture.organizationId,
      versionId,
      snapshot(),
    );
    await expect(
      recipeRepository.updateVersion(fixture.organizationId, versionId, input),
    ).resolves.toBe(false);
    await expect(
      recipeRepository.addLine(fixture.organizationId, versionId, {
        itemId: fixture.items.flour,
        quantity: "1",
        unitId: referenceUnits.kg,
        lossPct: "0",
        isOptional: false,
        note: null,
      }),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("clones a source version into the next version number", async () => {
    const {recipeId, versionId} = await createRecipe();
    await recipeRepository.addLine(fixture.organizationId, versionId, {
      itemId: fixture.items.flour,
      quantity: "2",
      unitId: referenceUnits.kg,
      lossPct: "10",
      isOptional: false,
      note: "Sifted",
    });
    await recipeRepository.addOperation(fixture.organizationId, versionId, {
      name: "Mix",
      description: "Low speed",
      durationMinutes: 10,
      activeMinutes: 5,
      equipmentId: null,
      labourRateId: null,
      requiredSkillId: null,
    });
    await recipeRepository.updateVersion(fixture.organizationId, versionId, {
      yieldQuantity: "8",
      yieldUnitId: referenceUnits.piece,
      portionCount: 8,
      prepMinutes: null,
      cookMinutes: null,
      instructions: null,
      changeNote: null,
    });

    const nextId = await recipeRepository.createVersion(
      fixture.organizationId,
      recipeId,
      versionId,
    );
    const next = await recipeRepository.findVersion(
      fixture.organizationId,
      nextId,
    );

    expect(next).toMatchObject({
      versionNumber: 2,
      status: "DRAFT",
      yieldQuantity: "8",
      lines: [expect.objectContaining({itemId: fixture.items.flour, lossPct: "10"})],
      operations: [expect.objectContaining({name: "Mix", durationMinutes: 10})],
    });

    const emptyId = await recipeRepository.createVersion(
      fixture.organizationId,
      recipeId,
      null,
    );
    const empty = await recipeRepository.findVersion(
      fixture.organizationId,
      emptyId,
    );
    expect(empty).toMatchObject({versionNumber: 3, yieldQuantity: "1", lines: []});
  });

  it("publishes the version, archives the previous one and stores the snapshot", async () => {
    const {recipeId, versionId} = await createRecipe();
    await recipeRepository.publish(
      fixture.organizationId,
      versionId,
      snapshot(),
    );

    const version = await prisma.recipeVersion.findUniqueOrThrow({
      where: {id: versionId},
      select: {status: true, publishedAt: true},
    });
    expect(version.status).toBe("PUBLISHED");
    expect(version.publishedAt).not.toBeNull();

    const recipe = await prisma.recipe.findUniqueOrThrow({
      where: {id: recipeId},
      select: {currentVersionId: true},
    });
    expect(recipe.currentVersionId).toBe(versionId);

    const cost = await prisma.costSnapshot.findFirstOrThrow({
      where: {recipeVersionId: versionId},
      select: {
        scope: true,
        totalCost: true,
        lines: {select: {kind: true, label: true}},
      },
    });
    expect(cost.scope).toBe("RECIPE_VERSION");
    expect(cost.totalCost.toString()).toBe("3.85");
    expect(cost.lines[0]).toMatchObject({kind: "MATERIAL", label: "Flour"});

    const nextId = await recipeRepository.createVersion(
      fixture.organizationId,
      recipeId,
      versionId,
    );
    await recipeRepository.publish(fixture.organizationId, nextId, snapshot());

    const statuses = await prisma.recipeVersion.findMany({
      where: {recipeId},
      orderBy: {versionNumber: "asc"},
      select: {versionNumber: true, status: true},
    });
    expect(statuses).toEqual([
      {versionNumber: 1, status: "ARCHIVED"},
      {versionNumber: 2, status: "PUBLISHED"},
    ]);

    await expect(
      recipeRepository.publish(fixture.organizationId, versionId, snapshot()),
    ).rejects.toMatchObject({code: "INVALID_STATE_TRANSITION"});
  });

  it("lists recipes with their current version and latest cost", async () => {
    const {recipeId, versionId} = await createRecipe();
    await recipeRepository.publish(
      fixture.organizationId,
      versionId,
      snapshot(),
    );

    const list = await recipeRepository.list(fixture.organizationId);
    const row = list.find((recipe) => recipe.id === recipeId);
    expect(row).toMatchObject({
      versionNumber: 1,
      status: "PUBLISHED",
      costPerUnit: "0.385",
      currency: "EUR",
      marginPct: "84.6",
      isArchived: false,
    });

    const detail = await recipeRepository.findRecipe(
      fixture.organizationId,
      recipeId,
    );
    expect(detail?.currentVersionId).toBe(versionId);
    expect(detail?.versions).toHaveLength(1);
  });

  it("builds the recipe graph from the current version", async () => {
    const {recipeId, versionId} = await createRecipe();
    await recipeRepository.addLine(fixture.organizationId, versionId, {
      itemId: fixture.items.flour,
      quantity: "1",
      unitId: referenceUnits.kg,
      lossPct: "0",
      isOptional: false,
      note: null,
    });
    await recipeRepository.publish(
      fixture.organizationId,
      versionId,
      snapshot(),
    );

    const graph = await recipeRepository.listGraph(fixture.organizationId);
    expect(graph).toContainEqual({
      outputItemId: fixture.items.croissant,
      lineItemIds: [fixture.items.flour],
    });
    expect(recipeId).toBeTruthy();
  });

  it("archives a recipe once and scopes reads to the tenant", async () => {
    const {recipeId} = await createRecipe();

    await expect(
      recipeRepository.archive(fixture.organizationId, recipeId),
    ).resolves.toBe(true);
    await expect(
      recipeRepository.archive(fixture.organizationId, recipeId),
    ).resolves.toBe(false);
    await expect(
      recipeRepository.findRecipe("org_other", recipeId),
    ).resolves.toBeNull();
    await expect(
      recipeRepository.findVersion("org_other", "missing"),
    ).resolves.toBeNull();
  });
});
