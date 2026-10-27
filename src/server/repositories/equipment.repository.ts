import {prisma} from "@/lib/prisma";
import type {EquipmentRecord} from "./types";
import type {EquipmentKind} from "@/server/validators/equipment.schema";

export type EquipmentInput = {
  name: string;
  kind: EquipmentKind;
  siteId: string | null;
  powerKw: string | null;
};

const equipmentSelect = {
  id: true,
  name: true,
  kind: true,
  siteId: true,
  site: {select: {name: true}},
  powerKw: true,
  archivedAt: true,
} as const;

export interface EquipmentRepository {
  list(organizationId: string): Promise<EquipmentRecord[]>;
  create(
    organizationId: string,
    input: EquipmentInput,
  ): Promise<EquipmentRecord>;
  archive(organizationId: string, id: string): Promise<boolean>;
}

export const equipmentRepository: EquipmentRepository = {
  async list(organizationId) {
    const equipment = await prisma.equipment.findMany({
      where: {organizationId},
      orderBy: [{archivedAt: "asc"}, {name: "asc"}],
      select: equipmentSelect,
    });

    return equipment.map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.kind,
      siteId: row.siteId,
      siteName: row.site?.name ?? null,
      powerKw: row.powerKw?.toString() ?? null,
      archivedAt: row.archivedAt,
    }));
  },

  async create(organizationId, input) {
    const equipment = await prisma.equipment.create({
      data: {organizationId, ...input},
      select: equipmentSelect,
    });

    return {
      id: equipment.id,
      name: equipment.name,
      kind: equipment.kind,
      siteId: equipment.siteId,
      siteName: equipment.site?.name ?? null,
      powerKw: equipment.powerKw?.toString() ?? null,
      archivedAt: equipment.archivedAt,
    };
  },

  async archive(organizationId, id) {
    const result = await prisma.equipment.updateMany({
      where: {id, organizationId, archivedAt: null},
      data: {archivedAt: new Date()},
    });

    return result.count > 0;
  },
};
