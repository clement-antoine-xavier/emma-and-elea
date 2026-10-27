import type {UnitKindName} from "@/server/domain/units";

export type UnitFixture = {
  id: string;
  code: string;
  labelEn: string;
  labelFr: string;
  kind: UnitKindName;
  factorToBase: string;
  isBase: boolean;
};

const units: Record<string, UnitFixture> = {
  kg: {
    id: "unit_kg",
    code: "kg",
    labelEn: "kilogram",
    labelFr: "kilogramme",
    kind: "MASS",
    factorToBase: "1",
    isBase: true,
  },
  g: {
    id: "unit_g",
    code: "g",
    labelEn: "gram",
    labelFr: "gramme",
    kind: "MASS",
    factorToBase: "0.001",
    isBase: false,
  },
  L: {
    id: "unit_l",
    code: "L",
    labelEn: "litre",
    labelFr: "litre",
    kind: "VOLUME",
    factorToBase: "1",
    isBase: true,
  },
  piece: {
    id: "unit_piece",
    code: "piece",
    labelEn: "piece",
    labelFr: "pièce",
    kind: "COUNT",
    factorToBase: "1",
    isBase: true,
  },
};

/** Reference units inserted by the Phase 1 migration. */
export function unit(code: keyof typeof units): UnitFixture {
  return {...units[code]};
}

/** A `findUnit` implementation backed by the fixture table. */
export async function findFixtureUnit(
  id: string,
): Promise<UnitFixture | null> {
  return Object.values(units).find((candidate) => candidate.id === id) ?? null;
}
