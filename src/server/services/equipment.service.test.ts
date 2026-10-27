import {createEquipmentService} from "@/server/services/equipment.service";
import type {EquipmentRepository} from "@/server/repositories/equipment.repository";
import type {EquipmentRecord} from "@/lib/dto";
import {actorFor} from "@/test-utils/actor";

const equipment: EquipmentRecord = {
  id: "equipment_1",
  name: "Deck oven",
  kind: "OVEN",
  siteId: null,
  siteName: null,
  powerKw: "12",
  archivedAt: null,
};

const input = {
  name: "Deck oven",
  kind: "OVEN" as const,
  siteId: null,
  powerKw: "12",
};

function repository(
  overrides: Partial<EquipmentRepository> = {},
): EquipmentRepository {
  return {
    list: jest.fn().mockResolvedValue([equipment]),
    create: jest.fn().mockResolvedValue(equipment),
    archive: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("equipment service", () => {
  it("requires a signed-in member", async () => {
    const service = createEquipmentService({
      equipmentRepository: repository(),
    });

    await expect(service.getEquipment(null)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("requires equipment:read", async () => {
    const service = createEquipmentService({
      equipmentRepository: repository(),
    });

    await expect(
      service.getEquipment(actorFor("sales")),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });

  it("lists equipment with a write flag", async () => {
    const service = createEquipmentService({
      equipmentRepository: repository(),
    });

    await expect(
      service.getEquipment(actorFor("production_manager")),
    ).resolves.toEqual({equipment: [equipment], canWrite: true});

    await expect(
      service.getEquipment(actorFor("stock_manager")),
    ).resolves.toMatchObject({canWrite: false});
  });

  it("creates equipment", async () => {
    const repo = repository();
    const service = createEquipmentService({equipmentRepository: repo});

    await expect(
      service.createEquipment(actorFor("production_manager"), input),
    ).resolves.toEqual(equipment);
    expect(repo.create).toHaveBeenCalledWith("org_1", input);
  });

  it("maps a foreign-key failure to NOT_FOUND", async () => {
    const service = createEquipmentService({
      equipmentRepository: repository({
        create: jest
          .fn()
          .mockRejectedValue(Object.assign(new Error("fk"), {code: "P2003"})),
      }),
    });

    await expect(
      service.createEquipment(actorFor("production_manager"), input),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("rethrows unrelated write failures", async () => {
    const original = new Error("boom");
    const service = createEquipmentService({
      equipmentRepository: repository({
        create: jest.fn().mockRejectedValue(original),
      }),
    });

    await expect(
      service.createEquipment(actorFor("production_manager"), input),
    ).rejects.toBe(original);
  });

  it("archives equipment and reports a missing row", async () => {
    const service = createEquipmentService({
      equipmentRepository: repository(),
    });
    await expect(
      service.archiveEquipment(actorFor("production_manager"), "equipment_1"),
    ).resolves.toBeUndefined();

    const missing = createEquipmentService({
      equipmentRepository: repository({
        archive: jest.fn().mockResolvedValue(false),
      }),
    });
    await expect(
      missing.archiveEquipment(actorFor("production_manager"), "missing"),
    ).rejects.toMatchObject({code: "NOT_FOUND"});
  });

  it("rejects writes without equipment:write", async () => {
    const service = createEquipmentService({
      equipmentRepository: repository(),
    });

    await expect(
      service.createEquipment(actorFor("stock_manager"), input),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
    await expect(
      service.archiveEquipment(actorFor("stock_manager"), "equipment_1"),
    ).rejects.toMatchObject({code: "FORBIDDEN"});
  });
});
