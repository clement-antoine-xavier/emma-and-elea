import {prisma} from "@/lib/prisma";
import type {Prisma} from "@/generated/prisma/client";
import {DomainError} from "@/server/domain/errors";
import {
  buildLotNumber,
  nextDocumentSequence,
  receiptLineTotal,
  receiptNumberPrefix,
  receiptTotal,
  stockQuantity,
  stockUnitCost,
} from "@/server/domain/receipt";
import type {
  ReceiptDetailRecord,
  ReceiptLineRecord,
  ReceiptStatusName,
  ReceiptSummaryRecord,
} from "@/lib/dto";
import {withTransaction} from "./transaction";

export type ReceiptDraftInput = {
  siteId: string;
  supplierId: string;
  supplierReference: string | null;
  note: string | null;
};

export type ReceiptLineInput = {
  itemId: string;
  quantity: string;
  unitId: string;
  unitPrice: string;
  lotNumber: string | null;
  supplierLotNumber: string | null;
  expiresOn: Date | null;
  bestBeforeOn: Date | null;
};

export type ReceiptFilters = {
  search: string;
  status: ReceiptStatusName | null;
  skip: number;
  take: number;
};

export type ReceiptPage = {
  receipts: ReceiptSummaryRecord[];
  total: number;
};

export type StockItemUnit = {
  id: string;
  code: string;
  kind: "MASS" | "VOLUME" | "COUNT" | "LENGTH";
  factorToBase: string;
  isBase: boolean;
};

export interface PurchaseRepository {
  listReceipts(
    organizationId: string,
    filters: ReceiptFilters,
  ): Promise<ReceiptPage>;
  findReceipt(
    organizationId: string,
    id: string,
  ): Promise<ReceiptDetailRecord | null>;
  createDraft(
    organizationId: string,
    input: ReceiptDraftInput,
  ): Promise<string>;
  addLine(
    organizationId: string,
    receiptId: string,
    input: ReceiptLineInput,
  ): Promise<void>;
  removeLine(
    organizationId: string,
    receiptId: string,
    lineId: string,
  ): Promise<void>;
  post(
    organizationId: string,
    receiptId: string,
    userId: string,
  ): Promise<void>;
  cancel(organizationId: string, receiptId: string): Promise<void>;
  findItemForLine(
    organizationId: string,
    itemId: string,
  ): Promise<{
    id: string;
    stockUnit: StockItemUnit;
  } | null>;
}

const receiptSummarySelect = {
  id: true,
  number: true,
  status: true,
  receivedAt: true,
  totalAmount: true,
  currency: true,
  createdAt: true,
  supplier: {select: {name: true}},
  site: {select: {name: true}},
  _count: {select: {lines: true}},
} as const;

type SelectedReceiptSummary = {
  id: string;
  number: string;
  status: string;
  receivedAt: Date | null;
  totalAmount: {toString(): string};
  currency: string;
  createdAt: Date;
  supplier: {name: string};
  site: {name: string};
  _count: {lines: number};
};

function toSummary(receipt: SelectedReceiptSummary): ReceiptSummaryRecord {
  return {
    id: receipt.id,
    number: receipt.number,
    supplierName: receipt.supplier.name,
    siteName: receipt.site.name,
    status: receipt.status as ReceiptStatusName,
    receivedAt: receipt.receivedAt,
    totalAmount: receipt.totalAmount.toString(),
    currency: receipt.currency,
    lineCount: receipt._count.lines,
    createdAt: receipt.createdAt,
  };
}

export const purchaseRepository: PurchaseRepository = {
  async listReceipts(organizationId, filters) {
    const where: Prisma.PurchaseReceiptWhereInput = {
      organizationId,
      status: filters.status ?? undefined,
      OR: filters.search
        ? [
            {number: {contains: filters.search, mode: "insensitive"}},
            {
              supplier: {
                name: {contains: filters.search, mode: "insensitive"},
              },
            },
          ]
        : undefined,
    };

    const [total, receipts] = await prisma.$transaction([
      prisma.purchaseReceipt.count({where}),
      prisma.purchaseReceipt.findMany({
        where,
        orderBy: {createdAt: "desc"},
        skip: filters.skip,
        take: filters.take,
        select: receiptSummarySelect,
      }),
    ]);

    return {receipts: receipts.map(toSummary), total};
  },

  async findReceipt(organizationId, id) {
    const receipt = await prisma.purchaseReceipt.findFirst({
      where: {id, organizationId},
      select: {
        ...receiptSummarySelect,
        supplierId: true,
        siteId: true,
        supplierReference: true,
        note: true,
        lines: {
          orderBy: {createdAt: "asc"},
          select: {
            id: true,
            itemId: true,
            item: {select: {code: true, name: true}},
            quantity: true,
            unit: {select: {code: true}},
            unitPrice: true,
            lineTotal: true,
            lotNumber: true,
            supplierLotNumber: true,
            expiresOn: true,
            bestBeforeOn: true,
            lot: {select: {id: true, lotNumber: true}},
          },
        },
      },
    });

    if (!receipt) return null;

    const lines: ReceiptLineRecord[] = receipt.lines.map((line) => ({
      id: line.id,
      itemId: line.itemId,
      itemCode: line.item.code,
      itemName: line.item.name,
      quantity: line.quantity.toString(),
      unitCode: line.unit.code,
      unitPrice: line.unitPrice.toString(),
      lineTotal: line.lineTotal.toString(),
      lotNumber: line.lot?.lotNumber ?? line.lotNumber,
      supplierLotNumber: line.supplierLotNumber,
      expiresOn: line.expiresOn,
      bestBeforeOn: line.bestBeforeOn,
      lotId: line.lot?.id ?? null,
    }));

    return {
      ...toSummary(receipt),
      supplierId: receipt.supplierId,
      siteId: receipt.siteId,
      supplierReference: receipt.supplierReference,
      note: receipt.note,
      lines,
    };
  },

  async createDraft(organizationId, input) {
    return withTransaction(async (tx) => {
      const now = new Date();
      const prefix = receiptNumberPrefix(now);
      const existing = await tx.purchaseReceipt.findMany({
        where: {organizationId, number: {startsWith: prefix}},
        select: {number: true},
      });
      const sequence = nextDocumentSequence(
        existing.map((receipt) => receipt.number),
        prefix,
      );
      const number = `${prefix}-${String(sequence).padStart(3, "0")}`;

      const receipt = await tx.purchaseReceipt.create({
        data: {organizationId, ...input, number, status: "DRAFT"},
        select: {id: true},
      });

      return receipt.id;
    });
  },

  async addLine(organizationId, receiptId, input) {
    await withTransaction(async (tx) => {
      const receipt = await tx.purchaseReceipt.findFirst({
        where: {id: receiptId, organizationId},
        select: {status: true},
      });

      if (!receipt) throw new DomainError("NOT_FOUND");
      if (receipt.status !== "DRAFT") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      await tx.purchaseReceiptLine.create({
        data: {
          organizationId,
          purchaseReceiptId: receiptId,
          ...input,
          lineTotal: receiptLineTotal(input.quantity, input.unitPrice),
        },
      });
    });
  },

  async removeLine(organizationId, receiptId, lineId) {
    await withTransaction(async (tx) => {
      const receipt = await tx.purchaseReceipt.findFirst({
        where: {id: receiptId, organizationId},
        select: {status: true},
      });

      if (!receipt) throw new DomainError("NOT_FOUND");
      if (receipt.status !== "DRAFT") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }

      const result = await tx.purchaseReceiptLine.deleteMany({
        where: {id: lineId, purchaseReceiptId: receiptId, organizationId},
      });

      if (result.count === 0) throw new DomainError("NOT_FOUND");
    });
  },

  async post(organizationId, receiptId, userId) {
    await withTransaction(async (tx) => {
      const receipt = await tx.purchaseReceipt.findFirst({
        where: {id: receiptId, organizationId},
        select: {
          id: true,
          status: true,
          currency: true,
          siteId: true,
          site: {select: {code: true}},
          lines: {
            orderBy: {createdAt: "asc"},
            select: {
              id: true,
              itemId: true,
              quantity: true,
              unitPrice: true,
              lotNumber: true,
              supplierLotNumber: true,
              expiresOn: true,
              bestBeforeOn: true,
              lineTotal: true,
              unit: {
                select: {
                  code: true,
                  kind: true,
                  factorToBase: true,
                  isBase: true,
                },
              },
              item: {
                select: {
                  stockUnitId: true,
                  stockUnit: {
                    select: {
                      code: true,
                      kind: true,
                      factorToBase: true,
                      isBase: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!receipt) throw new DomainError("NOT_FOUND");
      if (receipt.status !== "DRAFT") {
        throw new DomainError("INVALID_STATE_TRANSITION");
      }
      if (receipt.lines.length === 0) {
        throw new DomainError("INVALID_INPUT", "A receipt needs at least one line.");
      }

      const settings = await tx.organizationSetting.findUnique({
        where: {organizationId},
        select: {lotNumberPattern: true},
      });
      const pattern = settings?.lotNumberPattern ?? "{site}-{yyMMdd}-{seq}";

      const receivedAt = new Date();
      const dayStart = new Date(receivedAt);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

      const existingLots = await tx.lot.count({
        where: {
          organizationId,
          siteId: receipt.siteId,
          receivedAt: {gte: dayStart, lt: dayEnd},
        },
      });

      let sequence = existingLots + 1;

      for (const line of receipt.lines) {
        const lineUnit = {
          code: line.unit.code,
          kind: line.unit.kind,
          factorToBase: line.unit.factorToBase.toString(),
          isBase: line.unit.isBase,
        };
        const stockUnit = {
          code: line.item.stockUnit.code,
          kind: line.item.stockUnit.kind,
          factorToBase: line.item.stockUnit.factorToBase.toString(),
          isBase: line.item.stockUnit.isBase,
        };

        const quantity = stockQuantity(
          line.quantity.toString(),
          lineUnit,
          stockUnit,
        );
        const unitCost = stockUnitCost(
          line.unitPrice.toString(),
          lineUnit,
          stockUnit,
        );
        const lotNumber =
          line.lotNumber?.trim() ||
          buildLotNumber(pattern, {
            siteCode: receipt.site.code,
            date: receivedAt,
            sequence,
          });
        sequence += 1;

        const lot = await tx.lot.create({
          data: {
            organizationId,
            siteId: receipt.siteId,
            itemId: line.itemId,
            purchaseReceiptLineId: line.id,
            lotNumber,
            supplierLotNumber: line.supplierLotNumber,
            receivedAt,
            expiresOn: line.expiresOn,
            bestBeforeOn: line.bestBeforeOn,
            quantityReceived: quantity,
            quantityRemaining: quantity,
            unitCost,
            currency: receipt.currency,
            status: "AVAILABLE",
          },
          select: {id: true},
        });

        await tx.stockMovement.create({
          data: {
            organizationId,
            siteId: receipt.siteId,
            itemId: line.itemId,
            lotId: lot.id,
            type: "RECEIPT",
            quantity,
            unitId: line.item.stockUnitId,
            occurredAt: receivedAt,
            referenceType: "PURCHASE_RECEIPT",
            referenceId: receipt.id,
            createdById: userId,
          },
        });

        // Keep the document readable: the line shows the lot it created.
        await tx.purchaseReceiptLine.update({
          where: {id: line.id},
          data: {lotNumber},
        });
      }

      await tx.purchaseReceipt.update({
        where: {id: receipt.id},
        data: {
          status: "POSTED",
          receivedAt,
          receivedById: userId,
          totalAmount: receiptTotal(
            receipt.lines.map((line) => ({lineTotal: line.lineTotal})),
          ),
        },
      });
    });
  },

  async cancel(organizationId, receiptId) {
    const result = await prisma.purchaseReceipt.updateMany({
      where: {id: receiptId, organizationId, status: "DRAFT"},
      data: {status: "CANCELLED"},
    });

    if (result.count === 0) throw new DomainError("INVALID_STATE_TRANSITION");
  },

  async findItemForLine(organizationId, itemId) {
    const item = await prisma.item.findFirst({
      where: {id: itemId, organizationId, archivedAt: null},
      select: {
        id: true,
        stockUnit: {
          select: {
            id: true,
            code: true,
            kind: true,
            factorToBase: true,
            isBase: true,
          },
        },
      },
    });

    if (!item) return null;

    return {
      id: item.id,
      stockUnit: {
        id: item.stockUnit.id,
        code: item.stockUnit.code,
        kind: item.stockUnit.kind,
        factorToBase: item.stockUnit.factorToBase.toString(),
        isBase: item.stockUnit.isBase,
      },
    };
  },
};
