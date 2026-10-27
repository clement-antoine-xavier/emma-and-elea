import {prisma} from "@/lib/prisma";
import type {
  SupplierDetailRecord,
  SupplierItemRecord,
  SupplierListRecord,
  SupplierRecord,
} from "@/lib/dto";

export type SupplierInput = {
  code: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  defaultLeadTimeDays: number | null;
  note: string | null;
};

export type SupplierItemInput = {
  itemId: string;
  supplierRef: string | null;
  packQuantity: string;
  packUnitId: string;
  price: string;
  leadTimeDays: number | null;
  minOrderQuantity: string | null;
  isPreferred: boolean;
  validFrom: Date;
};

export interface SupplierRepository {
  list(organizationId: string): Promise<SupplierListRecord[]>;
  findById(
    organizationId: string,
    id: string,
  ): Promise<SupplierDetailRecord | null>;
  findSummary(
    organizationId: string,
    id: string,
  ): Promise<SupplierRecord | null>;
  create(
    organizationId: string,
    input: SupplierInput,
  ): Promise<string>;
  update(
    organizationId: string,
    id: string,
    input: SupplierInput,
  ): Promise<boolean>;
  archive(organizationId: string, id: string): Promise<boolean>;
  createItem(
    organizationId: string,
    supplierId: string,
    input: SupplierItemInput,
  ): Promise<string>;
  closeItem(organizationId: string, id: string, validTo: Date): Promise<boolean>;
}

const supplierSelect = {
  id: true,
  code: true,
  name: true,
  contactName: true,
  email: true,
  phone: true,
  city: true,
  defaultLeadTimeDays: true,
  note: true,
  archivedAt: true,
} as const;

type SelectedSupplier = {
  id: string;
  code: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  defaultLeadTimeDays: number | null;
  note: string | null;
  archivedAt: Date | null;
};

function toRecord(supplier: SelectedSupplier): SupplierRecord {
  return {
    id: supplier.id,
    code: supplier.code,
    name: supplier.name,
    contactName: supplier.contactName,
    email: supplier.email,
    phone: supplier.phone,
    city: supplier.city,
    defaultLeadTimeDays: supplier.defaultLeadTimeDays,
    note: supplier.note,
    isArchived: supplier.archivedAt !== null,
  };
}

const supplierItemSelect = {
  id: true,
  itemId: true,
  item: {select: {code: true, name: true}},
  supplierRef: true,
  packQuantity: true,
  packUnitId: true,
  packUnit: {select: {code: true}},
  price: true,
  currency: true,
  leadTimeDays: true,
  minOrderQuantity: true,
  isPreferred: true,
  validFrom: true,
  validTo: true,
  archivedAt: true,
} as const;

type SelectedSupplierItem = {
  id: string;
  itemId: string;
  item: {code: string; name: string};
  supplierRef: string | null;
  packQuantity: {toString(): string};
  packUnitId: string;
  packUnit: {code: string};
  price: {toString(): string};
  currency: string;
  leadTimeDays: number | null;
  minOrderQuantity: {toString(): string} | null;
  isPreferred: boolean;
  validFrom: Date;
  validTo: Date | null;
  archivedAt: Date | null;
};

function toItemRecord(item: SelectedSupplierItem): SupplierItemRecord {
  return {
    id: item.id,
    itemId: item.itemId,
    itemCode: item.item.code,
    itemName: item.item.name,
    supplierRef: item.supplierRef,
    packQuantity: item.packQuantity.toString(),
    packUnitId: item.packUnitId,
    packUnitCode: item.packUnit.code,
    price: item.price.toString(),
    currency: item.currency,
    leadTimeDays: item.leadTimeDays,
    minOrderQuantity: item.minOrderQuantity?.toString() ?? null,
    isPreferred: item.isPreferred,
    validFrom: item.validFrom,
    validTo: item.validTo,
    isArchived: item.archivedAt !== null || item.validTo !== null,
  };
}

export const supplierRepository: SupplierRepository = {
  async list(organizationId) {
    const suppliers = await prisma.supplier.findMany({
      where: {organizationId},
      orderBy: [{archivedAt: "asc"}, {name: "asc"}],
      select: {
        ...supplierSelect,
        items: {
          where: {archivedAt: null},
          select: {id: true},
        },
      },
    });

    return suppliers.map((supplier) => ({
      ...toRecord(supplier),
      activeItemCount: supplier.items.length,
    }));
  },

  async findById(organizationId, id) {
    const supplier = await prisma.supplier.findFirst({
      where: {id, organizationId},
      select: {
        ...supplierSelect,
        items: {
          orderBy: [{item: {name: "asc"}}, {validFrom: "desc"}],
          select: supplierItemSelect,
        },
      },
    });

    if (!supplier) return null;

    return {
      ...toRecord(supplier),
      items: supplier.items.map(toItemRecord),
    };
  },

  async findSummary(organizationId, id) {
    const supplier = await prisma.supplier.findFirst({
      where: {id, organizationId},
      select: supplierSelect,
    });

    return supplier ? toRecord(supplier) : null;
  },

  async create(organizationId, input) {
    const supplier = await prisma.supplier.create({
      data: {organizationId, ...input},
      select: {id: true},
    });

    return supplier.id;
  },

  async update(organizationId, id, input) {
    const result = await prisma.supplier.updateMany({
      where: {id, organizationId},
      data: input,
    });

    return result.count > 0;
  },

  async archive(organizationId, id) {
    const result = await prisma.supplier.updateMany({
      where: {id, organizationId, archivedAt: null},
      data: {archivedAt: new Date()},
    });

    return result.count > 0;
  },

  async createItem(organizationId, supplierId, input) {
    const item = await prisma.supplierItem.create({
      data: {organizationId, supplierId, ...input},
      select: {id: true},
    });

    return item.id;
  },

  async closeItem(organizationId, id, validTo) {
    const result = await prisma.supplierItem.updateMany({
      where: {id, organizationId, validTo: null},
      data: {validTo},
    });

    return result.count > 0;
  },
};
