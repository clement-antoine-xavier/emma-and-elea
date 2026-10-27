import {prisma} from "@/lib/prisma";
import type {Prisma} from "@/generated/prisma/client";
import type {
  AllergenOption,
  CategoryRecord,
  ItemDetailRecord,
  ItemListRecord,
  ItemOption,
  ItemTypeName,
  SalesChannelName,
  UnitOption,
} from "@/lib/dto";
import {withTransaction} from "./transaction";

export type ItemInput = {
  categoryId: string | null;
  code: string;
  name: string;
  description: string | null;
  type: ItemTypeName;
  stockUnitId: string;
  saleUnitId: string | null;
  salePrice: string | null;
  vatRate: string;
  shelfLifeDays: number | null;
  minStockQuantity: string | null;
  parLevelQuantity: string | null;
  defaultChannel: SalesChannelName;
  isPurchasable: boolean;
  isProduced: boolean;
  isSellable: boolean;
};

export type CategoryInput = {
  name: string;
  parentId: string | null;
  sortOrder: number;
};

export type ItemFilters = {
  search: string;
  type: ItemTypeName | null;
  categoryId: string | null;
  includeArchived: boolean;
  skip: number;
  take: number;
};

export type ItemPage = {
  items: ItemListRecord[];
  total: number;
};

export interface CatalogRepository {
  listUnits(): Promise<UnitOption[]>;
  findUnit(id: string): Promise<UnitOption | null>;
  listItemOptions(organizationId: string): Promise<ItemOption[]>;
  listAllergens(): Promise<AllergenOption[]>;
  listItems(
    organizationId: string,
    filters: ItemFilters,
  ): Promise<ItemPage>;
  findItem(
    organizationId: string,
    id: string,
  ): Promise<ItemDetailRecord | null>;
  findItemSummary(
    organizationId: string,
    id: string,
  ): Promise<{id: string} | null>;
  createItem(organizationId: string, input: ItemInput): Promise<string>;
  updateItem(
    organizationId: string,
    id: string,
    input: ItemInput,
  ): Promise<boolean>;
  archiveItem(organizationId: string, id: string): Promise<boolean>;
  listCategories(organizationId: string): Promise<CategoryRecord[]>;
  findCategory(
    organizationId: string,
    id: string,
  ): Promise<{id: string; parentId: string | null} | null>;
  createCategory(
    organizationId: string,
    input: CategoryInput,
  ): Promise<string>;
  archiveCategory(organizationId: string, id: string): Promise<boolean>;
  setItemAllergen(
    organizationId: string,
    input: {
      itemId: string;
      allergenId: string;
      presence: "CONTAINS" | "MAY_CONTAIN";
      note: string | null;
    },
  ): Promise<void>;
  removeItemAllergen(
    organizationId: string,
    id: string,
  ): Promise<boolean>;
}

const unitSelect = {
  id: true,
  code: true,
  labelEn: true,
  labelFr: true,
  kind: true,
  isBase: true,
} as const;

const itemListSelect = {
  id: true,
  code: true,
  name: true,
  type: true,
  category: {select: {id: true, name: true}},
  stockUnit: {select: {code: true}},
  saleUnit: {select: {code: true}},
  salePrice: true,
  vatRate: true,
  isPurchasable: true,
  isProduced: true,
  isSellable: true,
  archivedAt: true,
} as const;

function toListRecord(item: {
  id: string;
  code: string;
  name: string;
  type: string;
  category: {id: string; name: string} | null;
  stockUnit: {code: string};
  saleUnit: {code: string} | null;
  salePrice: {toString(): string} | null;
  vatRate: {toString(): string};
  isPurchasable: boolean;
  isProduced: boolean;
  isSellable: boolean;
  archivedAt: Date | null;
}): ItemListRecord {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    type: item.type as ItemTypeName,
    categoryId: item.category?.id ?? null,
    categoryName: item.category?.name ?? null,
    stockUnitCode: item.stockUnit.code,
    saleUnitCode: item.saleUnit?.code ?? null,
    salePrice: item.salePrice?.toString() ?? null,
    vatRate: item.vatRate.toString(),
    isPurchasable: item.isPurchasable,
    isProduced: item.isProduced,
    isSellable: item.isSellable,
    isArchived: item.archivedAt !== null,
  };
}

export const catalogRepository: CatalogRepository = {
  async listUnits() {
    return prisma.unit.findMany({
      orderBy: [{kind: "asc"}, {factorToBase: "asc"}],
      select: unitSelect,
    });
  },

  async findUnit(id) {
    return prisma.unit.findUnique({where: {id}, select: unitSelect});
  },

  async listItemOptions(organizationId) {
    const items = await prisma.item.findMany({
      where: {organizationId, archivedAt: null},
      orderBy: {name: "asc"},
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        stockUnitId: true,
      },
    });

    return items.map((item) => ({
      ...item,
      type: item.type as ItemTypeName,
    }));
  },

  async listAllergens() {
    return prisma.allergen.findMany({
      orderBy: {sortOrder: "asc"},
      select: {id: true, code: true, labelEn: true, labelFr: true},
    });
  },

  async listItems(organizationId, filters) {
    const where: Prisma.ItemWhereInput = {
      organizationId,
      type: filters.type ?? undefined,
      categoryId: filters.categoryId ?? undefined,
      archivedAt: filters.includeArchived ? undefined : null,
      OR: filters.search
        ? [
            {name: {contains: filters.search, mode: "insensitive"}},
            {code: {contains: filters.search, mode: "insensitive"}},
          ]
        : undefined,
    };

    const [total, items] = await prisma.$transaction([
      prisma.item.count({where}),
      prisma.item.findMany({
        where,
        orderBy: [{archivedAt: "asc"}, {name: "asc"}],
        skip: filters.skip,
        take: filters.take,
        select: itemListSelect,
      }),
    ]);

    return {items: items.map(toListRecord), total};
  },

  async findItem(organizationId, id) {
    const item = await prisma.item.findFirst({
      where: {id, organizationId},
      select: {
        ...itemListSelect,
        description: true,
        categoryId: true,
        stockUnitId: true,
        saleUnitId: true,
        shelfLifeDays: true,
        minStockQuantity: true,
        parLevelQuantity: true,
        defaultChannel: true,
        itemAllergens: {
          select: {
            id: true,
            allergenId: true,
            presence: true,
            note: true,
            allergen: {
              select: {code: true, labelEn: true, labelFr: true},
            },
          },
          orderBy: {allergen: {sortOrder: "asc"}},
        },
        recipeLines: {
          select: {
            recipeVersion: {
              select: {recipe: {select: {id: true, name: true}}},
            },
          },
        },
        recipes: {select: {id: true, name: true}},
        _count: {select: {supplierItems: true}},
      },
    });

    if (!item) return null;

    const usedIn = new Map<string, {id: string; name: string}>();
    for (const line of item.recipeLines) {
      const recipe = line.recipeVersion.recipe;
      usedIn.set(recipe.id, recipe);
    }

    return {
      ...toListRecord(item),
      description: item.description,
      categoryId: item.categoryId,
      stockUnitId: item.stockUnitId,
      saleUnitId: item.saleUnitId,
      shelfLifeDays: item.shelfLifeDays,
      minStockQuantity: item.minStockQuantity?.toString() ?? null,
      parLevelQuantity: item.parLevelQuantity?.toString() ?? null,
      defaultChannel: item.defaultChannel as SalesChannelName,
      allergens: item.itemAllergens.map((allergen) => ({
        id: allergen.id,
        allergenId: allergen.allergenId,
        code: allergen.allergen.code,
        labelEn: allergen.allergen.labelEn,
        labelFr: allergen.allergen.labelFr,
        presence: allergen.presence as "CONTAINS" | "MAY_CONTAIN",
        note: allergen.note,
      })),
      usedInRecipes: [...usedIn.values()],
      producesRecipes: item.recipes,
      supplierCount: item._count.supplierItems,
    };
  },

  async findItemSummary(organizationId, id) {
    return prisma.item.findFirst({
      where: {id, organizationId},
      select: {id: true},
    });
  },

  async createItem(organizationId, input) {
    const item = await prisma.item.create({
      data: {organizationId, ...input},
      select: {id: true},
    });

    return item.id;
  },

  async updateItem(organizationId, id, input) {
    const result = await prisma.item.updateMany({
      where: {id, organizationId},
      data: input,
    });

    return result.count > 0;
  },

  async archiveItem(organizationId, id) {
    const result = await prisma.item.updateMany({
      where: {id, organizationId, archivedAt: null},
      data: {archivedAt: new Date()},
    });

    return result.count > 0;
  },

  async listCategories(organizationId) {
    const categories = await prisma.itemCategory.findMany({
      where: {organizationId},
      orderBy: [{parentId: "asc"}, {sortOrder: "asc"}, {name: "asc"}],
      select: {
        id: true,
        name: true,
        parentId: true,
        parent: {select: {name: true}},
        sortOrder: true,
        archivedAt: true,
        items: {where: {archivedAt: null}, select: {id: true}},
        children: {where: {archivedAt: null}, select: {id: true}},
      },
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      parentName: category.parent?.name ?? null,
      sortOrder: category.sortOrder,
      itemCount: category.items.length,
      childCount: category.children.length,
      isArchived: category.archivedAt !== null,
    }));
  },

  async findCategory(organizationId, id) {
    return prisma.itemCategory.findFirst({
      where: {id, organizationId},
      select: {id: true, parentId: true},
    });
  },

  async createCategory(organizationId, input) {
    const category = await prisma.itemCategory.create({
      data: {organizationId, ...input},
      select: {id: true},
    });

    return category.id;
  },

  async archiveCategory(organizationId, id) {
    const result = await prisma.itemCategory.updateMany({
      where: {id, organizationId, archivedAt: null},
      data: {archivedAt: new Date()},
    });

    return result.count > 0;
  },

  async setItemAllergen(organizationId, input) {
    await withTransaction(async (tx) => {
      await tx.itemAllergen.deleteMany({
        where: {itemId: input.itemId, allergenId: input.allergenId},
      });

      await tx.itemAllergen.create({
        data: {
          organizationId,
          itemId: input.itemId,
          allergenId: input.allergenId,
          presence: input.presence,
          note: input.note,
        },
      });
    });
  },

  async removeItemAllergen(organizationId, id) {
    const result = await prisma.itemAllergen.deleteMany({
      where: {id, organizationId},
    });

    return result.count > 0;
  },
};
