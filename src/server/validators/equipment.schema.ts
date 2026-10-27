import {z} from "zod";

export const EQUIPMENT_KINDS = [
  "OVEN",
  "MIXER",
  "FRIDGE",
  "FREEZER",
  "PROOFER",
  "FRYER",
  "SCALE",
  "LABELLER",
  "OTHER",
] as const;

export type EquipmentKind = (typeof EQUIPMENT_KINDS)[number];

export const equipmentValidationKeys = [
  "nameRequired",
  "nameTooLong",
  "kindInvalid",
  "powerInvalid",
] as const;

export type EquipmentValidationKey =
  (typeof equipmentValidationKeys)[number];

export type TranslateEquipmentValidation = (
  key: EquipmentValidationKey,
) => string;

export function createEquipmentSchema(t: TranslateEquipmentValidation) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(2, t("nameRequired"))
      .max(80, t("nameTooLong")),
    kind: z
      .string()
      .refine(
        (value) => (EQUIPMENT_KINDS as readonly string[]).includes(value),
        t("kindInvalid"),
      ),
    siteId: z.string().trim(),
    powerKw: z
      .string()
      .trim()
      .refine(
        (value) =>
          !value ||
          (/^\d+(?:\.\d{1,3})?$/.test(value) &&
            Number(value) >= 0 &&
            Number(value) <= 500),
        t("powerInvalid"),
      ),
  });
}

export type CreateEquipmentValues = z.infer<
  ReturnType<typeof createEquipmentSchema>
>;

export const equipmentIdSchema = z.object({
  id: z.string().trim().min(1),
});
