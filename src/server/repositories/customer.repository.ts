import {prisma} from "@/lib/prisma";
import type {CustomerRecord} from "@/lib/dto";
import {DomainError} from "@/server/domain/errors";

export type CustomerInput = {
  code: string | null;
  name: string;
  type: "BUSINESS" | "INDIVIDUAL";
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  vatNumber: string | null;
  note: string | null;
};

export interface CustomerRepository {
  list(organizationId: string): Promise<CustomerRecord[]>;
  find(
    organizationId: string,
    id: string,
  ): Promise<CustomerRecord | null>;
  create(organizationId: string, input: CustomerInput): Promise<string>;
  update(
    organizationId: string,
    id: string,
    input: CustomerInput,
  ): Promise<boolean>;
  archive(organizationId: string, id: string): Promise<boolean>;
}

const customerSelect = {
  id: true,
  code: true,
  name: true,
  type: true,
  contactName: true,
  email: true,
  phone: true,
  city: true,
  vatNumber: true,
  note: true,
  archivedAt: true,
} as const;

function toRecord(customer: {
  id: string;
  code: string | null;
  name: string;
  type: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  vatNumber: string | null;
  note: string | null;
  archivedAt: Date | null;
}): CustomerRecord {
  return {
    id: customer.id,
    code: customer.code,
    name: customer.name,
    type: customer.type as CustomerRecord["type"],
    contactName: customer.contactName,
    email: customer.email,
    phone: customer.phone,
    city: customer.city,
    vatNumber: customer.vatNumber,
    note: customer.note,
    isArchived: customer.archivedAt !== null,
  };
}

export const customerRepository: CustomerRepository = {
  async list(organizationId) {
    const customers = await prisma.customer.findMany({
      where: {organizationId},
      orderBy: [{archivedAt: "asc"}, {name: "asc"}],
      select: customerSelect,
    });

    return customers.map(toRecord);
  },

  async find(organizationId, id) {
    const customer = await prisma.customer.findFirst({
      where: {id, organizationId},
      select: customerSelect,
    });

    return customer ? toRecord(customer) : null;
  },

  async create(organizationId, input) {
    const customer = await prisma.customer.create({
      data: {organizationId, ...input},
      select: {id: true},
    });

    return customer.id;
  },

  async update(organizationId, id, input) {
    const result = await prisma.customer.updateMany({
      where: {id, organizationId},
      data: input,
    });

    return result.count > 0;
  },

  async archive(organizationId, id) {
    const result = await prisma.customer.updateMany({
      where: {id, organizationId, archivedAt: null},
      data: {archivedAt: new Date()},
    });

    if (result.count === 0) throw new DomainError("NOT_FOUND");
    return true;
  },
};
