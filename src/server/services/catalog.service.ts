import {can} from "@/lib/permissions";
import {
  assertOrganizationActor,
  assertPermission,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import {DomainError} from "@/server/domain/errors";
import {
  assertItemInvariants,
  deriveProducedFlag,
} from "@/server/domain/item";
import type {
  AllergenOption,
  CategoryRecord,
  ItemDetailRecord,
  ItemListRecord,
  ItemTypeName,
  SalesChannelName,
  UnitOption,
} from "@/lib/dto";
import type {Page} from "@/server/repositories/types";
import {isUniqueConstraintError} from "@/server/repositories/errors";
import type {
  CatalogRepository,
  ItemInput,
} from "@/server/repositories/catalog.repository";
import {normalizePage} from "@/server/domain/pagination";
import {
  ITEM_TYPES,
  type CategoryInputValues,
  type ItemAllergenValues,
  type ItemInputValues,
} from "@/server/validators/catalog.schema";

export type CatalogFilters = {
  search?: string | string[];
  type?: string | string[];
  categoryId?: string | string[];
  includeArchived?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
};

export type CatalogView = {
  page: Page<ItemListRecord>;
  categories: CategoryRecord[];
  canWrite: boolean;
  filters: {
    search: string;
    type: ItemTypeName | null;
    categoryId: string | null;
    includeArchived: boolean;
  };
};

export type ItemFormOptions = {
  units: UnitOption[];
  categories: CategoryRecord[];
  allergens: AllergenOption[];
};

export interface CatalogService {
  getCatalogView(actor: Actor | null, filters: CatalogFilters): Promise<CatalogView>;
  getItemFormOptions(actor: Actor | null): Promise<ItemFormOptions>;
  getItem(actor: Actor | null, id: string): Promise<ItemDetailRecord | null>;
  createItem(
    actor: Actor | null,
    input: ItemInputValues,
  ): Promise<{id: string}>;
  updateItem(
    actor: Actor | null,
    id: string,
    input: ItemInputValues,
  ): Promise<void>;
  archiveItem(actor: Actor | null, id: string): Promise<void>;
  getCategoriesView(
    actor: Actor | null,
  ): Promise<{categories: CategoryRecord[]; canWrite: boolean}>;
  createCategory(
    actor: Actor | null,
    input: CategoryInputValues,
  ): Promise<{id: string}>;
  archiveCategory(actor: Actor | null, id: string): Promise<void>;
  setItemAllergen(
    actor: Actor | null,
    input: ItemAllergenValues,
  ): Promise<void>;
  removeItemAllergen(actor: Actor | null, id: string): Promise<void>;
}

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function isItemType(value: string): value is ItemTypeName {
  return (ITEM_TYPES as readonly string[]).includes(value);
}

function optionalNumber(value: string): number | null {
  return value === "" ? null : Number(value);
}

export function createCatalogService(deps: {
  catalogRepository: CatalogRepository;
}): CatalogService {
  async function requireItem(organizationId: string, id: string) {
    const item = await deps.catalogRepository.findItemSummary(
      organizationId,
      id,
    );
    if (!item) throw new DomainError("NOT_FOUND");
  }

  async function assertCategory(
    organizationId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await deps.catalogRepository.findCategory(
      organizationId,
      categoryId,
    );
    if (!category || category.parentId !== null) {
      throw new DomainError("INVALID_INPUT");
    }
  }

  async function normalizeInput(
    organizationId: string,
    input: ItemInputValues,
  ): Promise<ItemInput> {
    const stockUnit = await deps.catalogRepository.findUnit(input.stockUnitId);
    if (!stockUnit) throw new DomainError("INVALID_UNIT");

    const saleUnit = input.saleUnitId
      ? await deps.catalogRepository.findUnit(input.saleUnitId)
      : null;
    if (input.saleUnitId && !saleUnit) throw new DomainError("INVALID_UNIT");

    const salePrice = input.salePrice === "" ? null : input.salePrice;

    assertItemInvariants({
      type: input.type as ItemTypeName,
      stockUnit,
      saleUnit,
      salePrice,
      isSellable: input.isSellable,
    });

    if (input.categoryId) {
      await assertCategory(organizationId, input.categoryId);
    }

    return {
      categoryId: input.categoryId || null,
      code: input.code.toUpperCase(),
      name: input.name,
      description: input.description || null,
      type: input.type as ItemTypeName,
      stockUnitId: input.stockUnitId,
      saleUnitId: input.saleUnitId || null,
      salePrice,
      vatRate: input.vatRate,
      shelfLifeDays: optionalNumber(input.shelfLifeDays),
      minStockQuantity:
        input.minStockQuantity === "" ? null : input.minStockQuantity,
      parLevelQuantity:
        input.parLevelQuantity === "" ? null : input.parLevelQuantity,
      defaultChannel: input.defaultChannel as SalesChannelName,
      isPurchasable: input.isPurchasable,
      isProduced: deriveProducedFlag(
        input.type as ItemTypeName,
        input.isProduced,
      ),
      isSellable: input.isSellable,
    };
  }

  function mapUnique(error: unknown): never {
    if (isUniqueConstraintError(error)) {
      throw new DomainError("DUPLICATE_CODE", undefined, {cause: error});
    }
    throw error;
  }

  return {
    async getCatalogView(actorInput, filters) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "catalog:read");

      const window = normalizePage({
        page: single(filters.page),
        pageSize: single(filters.pageSize),
      });
      const search = single(filters.search);
      const typeValue = single(filters.type);
      const categoryId = single(filters.categoryId);
      const includeArchived = single(filters.includeArchived) === "true";

      const [{items, total}, categories] = await Promise.all([
        deps.catalogRepository.listItems(actor.organizationId, {
          search,
          type: isItemType(typeValue) ? typeValue : null,
          categoryId: categoryId || null,
          includeArchived,
          skip: window.skip,
          take: window.take,
        }),
        deps.catalogRepository.listCategories(actor.organizationId),
      ]);

      return {
        page: {
          items,
          total,
          page: window.page,
          pageSize: window.pageSize,
        },
        categories,
        canWrite: can(actor.role, "catalog:write"),
        filters: {
          search,
          type: isItemType(typeValue) ? typeValue : null,
          categoryId: categoryId || null,
          includeArchived,
        },
      };
    },

    async getItemFormOptions(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "catalog:read");

      const [units, categories, allergens] = await Promise.all([
        deps.catalogRepository.listUnits(),
        deps.catalogRepository.listCategories(actor.organizationId),
        deps.catalogRepository.listAllergens(),
      ]);

      return {
        units,
        categories: categories.filter((category) => !category.isArchived),
        allergens,
      };
    },

    async getItem(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "catalog:read");

      return deps.catalogRepository.findItem(actor.organizationId, id);
    },

    async createItem(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "catalog:write");

      const normalized = await normalizeInput(actor.organizationId, input);

      try {
        const id = await deps.catalogRepository.createItem(
          actor.organizationId,
          normalized,
        );
        return {id};
      } catch (error) {
        mapUnique(error);
      }
    },

    async updateItem(actorInput, id, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "catalog:write");

      await requireItem(actor.organizationId, id);
      const normalized = await normalizeInput(actor.organizationId, input);

      try {
        const updated = await deps.catalogRepository.updateItem(
          actor.organizationId,
          id,
          normalized,
        );
        if (!updated) throw new DomainError("NOT_FOUND");
      } catch (error) {
        mapUnique(error);
      }
    },

    async archiveItem(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "catalog:write");

      await requireItem(actor.organizationId, id);
      const archived = await deps.catalogRepository.archiveItem(
        actor.organizationId,
        id,
      );
      if (!archived) throw new DomainError("NOT_FOUND");
    },

    async getCategoriesView(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "catalog:read");

      return {
        categories: await deps.catalogRepository.listCategories(
          actor.organizationId,
        ),
        canWrite: can(actor.role, "catalog:write"),
      };
    },

    async createCategory(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "catalog:write");

      if (input.parentId) {
        await assertCategory(actor.organizationId, input.parentId);
      }

      try {
        const id = await deps.catalogRepository.createCategory(
          actor.organizationId,
          {
            name: input.name,
            parentId: input.parentId || null,
            sortOrder: Number(input.sortOrder),
          },
        );
        return {id};
      } catch (error) {
        mapUnique(error);
      }
    },

    async archiveCategory(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "catalog:write");

      const category = await deps.catalogRepository.findCategory(
        actor.organizationId,
        id,
      );
      if (!category) throw new DomainError("NOT_FOUND");

      const categories = await deps.catalogRepository.listCategories(
        actor.organizationId,
      );
      const target = categories.find((candidate) => candidate.id === id);
      if (target && (target.itemCount > 0 || target.childCount > 0)) {
        throw new DomainError(
          "INVALID_INPUT",
          "A category with items or children cannot be archived.",
        );
      }

      const archived = await deps.catalogRepository.archiveCategory(
        actor.organizationId,
        id,
      );
      if (!archived) throw new DomainError("NOT_FOUND");
    },

    async setItemAllergen(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "catalog:write");

      await requireItem(actor.organizationId, input.itemId);

      const allergens = await deps.catalogRepository.listAllergens();
      if (!allergens.some((allergen) => allergen.id === input.allergenId)) {
        throw new DomainError("NOT_FOUND");
      }

      await deps.catalogRepository.setItemAllergen(actor.organizationId, {
        itemId: input.itemId,
        allergenId: input.allergenId,
        presence: input.presence as "CONTAINS" | "MAY_CONTAIN",
        note: input.note || null,
      });
    },

    async removeItemAllergen(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "catalog:write");

      const removed = await deps.catalogRepository.removeItemAllergen(
        actor.organizationId,
        id,
      );
      if (!removed) throw new DomainError("NOT_FOUND");
    },
  };
}
