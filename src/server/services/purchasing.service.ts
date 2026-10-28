
import {
  assertOrganizationActor,
  assertPermission,
  isGranted,
} from "@/server/auth/guards";
import type {Actor} from "@/server/auth/types";
import {DomainError} from "@/server/domain/errors";
import {normalizePage} from "@/server/domain/pagination";
import type {
  ReceiptDetailRecord,
  ReceiptFormOptions,
  ReceiptStatusName,
} from "@/lib/dto";
import type {Page} from "@/server/repositories/types";
import type {
  PurchaseRepository,
  ReceiptDraftInput,
  ReceiptLineInput,
} from "@/server/repositories/purchase.repository";
import type {CatalogRepository} from "@/server/repositories/catalog.repository";
import type {SupplierRepository} from "@/server/repositories/supplier.repository";
import type {SiteRepository} from "@/server/repositories/site.repository";

export type ReceiptFiltersInput = {
  search?: string | string[];
  status?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
};

export type ReceiptsView = {
  page: Page<{
    id: string;
    number: string;
    supplierName: string;
    siteName: string;
    status: ReceiptStatusName;
    receivedAt: Date | null;
    totalAmount: string;
    currency: string;
    lineCount: number;
    createdAt: Date;
  }>;
  canWrite: boolean;
  filters: {search: string; status: ReceiptStatusName | null};
};

export interface PurchasingService {
  getReceipts(
    actor: Actor | null,
    filters: ReceiptFiltersInput,
  ): Promise<ReceiptsView>;
  getFormOptions(actor: Actor | null): Promise<ReceiptFormOptions>;
  getReceipt(
    actor: Actor | null,
    id: string,
  ): Promise<{receipt: ReceiptDetailRecord; canWrite: boolean} | null>;
  createDraft(
    actor: Actor | null,
    input: ReceiptDraftInput,
  ): Promise<{id: string}>;
  addLine(
    actor: Actor | null,
    receiptId: string,
    input: ReceiptLineInput,
  ): Promise<void>;
  removeLine(
    actor: Actor | null,
    receiptId: string,
    lineId: string,
  ): Promise<void>;
  postReceipt(actor: Actor | null, receiptId: string): Promise<void>;
  cancelReceipt(actor: Actor | null, receiptId: string): Promise<void>;
}

const STATUSES: readonly ReceiptStatusName[] = [
  "DRAFT",
  "POSTED",
  "CANCELLED",
];

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function isStatus(value: string): value is ReceiptStatusName {
  return (STATUSES as readonly string[]).includes(value);
}

export function createPurchasingService(deps: {
  purchaseRepository: PurchaseRepository;
  supplierRepository: SupplierRepository;
  siteRepository: SiteRepository;
  catalogRepository: CatalogRepository;
}): PurchasingService {
  async function requireDraftContext(
    organizationId: string,
    receiptId: string,
  ): Promise<ReceiptDetailRecord> {
    const receipt = await deps.purchaseRepository.findReceipt(
      organizationId,
      receiptId,
    );
    if (!receipt) throw new DomainError("NOT_FOUND");
    if (receipt.status !== "DRAFT") {
      throw new DomainError("INVALID_STATE_TRANSITION");
    }
    return receipt;
  }

  return {
    async getReceipts(actorInput, filters) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "purchasing:read");

      const window = normalizePage({
        page: single(filters.page),
        pageSize: single(filters.pageSize),
      });
      const search = single(filters.search);
      const statusValue = single(filters.status);
      const status = isStatus(statusValue) ? statusValue : null;

      const result = await deps.purchaseRepository.listReceipts(
        actor.organizationId,
        {search, status, skip: window.skip, take: window.take},
      );

      return {
        page: {
          items: result.receipts,
          total: result.total,
          page: window.page,
          pageSize: window.pageSize,
        },
        canWrite: isGranted(actor, "purchasing:write"),
        filters: {search, status},
      };
    },

    async getFormOptions(actorInput) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "purchasing:read");

      const [suppliers, sites, items, units] = await Promise.all([
        deps.supplierRepository.list(actor.organizationId),
        deps.siteRepository.list(actor.organizationId),
        deps.catalogRepository.listItemOptions(actor.organizationId),
        deps.catalogRepository.listUnits(),
      ]);

      return {
        suppliers: suppliers
          .filter((supplier) => !supplier.isArchived)
          .map((supplier) => ({
            id: supplier.id,
            name: supplier.name,
            code: supplier.code,
          })),
        sites: sites
          .filter((site) => !site.archivedAt)
          .map((site) => ({id: site.id, name: site.name, code: site.code})),
        items: items.map((item) => ({
          id: item.id,
          code: item.code,
          name: item.name,
        })),
        units: units.map((unit) => ({
          id: unit.id,
          code: unit.code,
          labelEn: unit.labelEn,
          labelFr: unit.labelFr,
        })),
      };
    },

    async getReceipt(actorInput, id) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "purchasing:read");

      const receipt = await deps.purchaseRepository.findReceipt(
        actor.organizationId,
        id,
      );

      if (!receipt) return null;

      return {
        receipt,
        canWrite: isGranted(actor, "purchasing:write"),
      };
    },

    async createDraft(actorInput, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "purchasing:write");

      const [site, supplier] = await Promise.all([
        deps.siteRepository.findById(actor.organizationId, input.siteId),
        deps.supplierRepository.findSummary(
          actor.organizationId,
          input.supplierId,
        ),
      ]);

      if (!site || !supplier) throw new DomainError("NOT_FOUND");

      return {
        id: await deps.purchaseRepository.createDraft(
          actor.organizationId,
          input,
        ),
      };
    },

    async addLine(actorInput, receiptId, input) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "purchasing:write");

      await requireDraftContext(actor.organizationId, receiptId);

      const [item, unit] = await Promise.all([
        deps.purchaseRepository.findItemForLine(
          actor.organizationId,
          input.itemId,
        ),
        deps.catalogRepository.findUnit(input.unitId),
      ]);

      if (!item) throw new DomainError("NOT_FOUND");
      if (!unit || unit.kind !== item.stockUnit.kind) {
        throw new DomainError("INVALID_UNIT");
      }

      await deps.purchaseRepository.addLine(
        actor.organizationId,
        receiptId,
        input,
      );
    },

    async removeLine(actorInput, receiptId, lineId) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "purchasing:write");

      await deps.purchaseRepository.removeLine(
        actor.organizationId,
        receiptId,
        lineId,
      );
    },

    async postReceipt(actorInput, receiptId) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "purchasing:write");

      await deps.purchaseRepository.post(
        actor.organizationId,
        receiptId,
        actor.userId,
      );
    },

    async cancelReceipt(actorInput, receiptId) {
      const actor = assertOrganizationActor(actorInput);
      assertPermission(actor, "purchasing:write");

      await deps.purchaseRepository.cancel(
        actor.organizationId,
        receiptId,
      );
    },
  };
}
