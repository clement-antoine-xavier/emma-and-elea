import {z} from "zod";
import {decimalString} from "./shared";

export const recipeValidationKeys = [
  "codeInvalid",
  "nameRequired",
  "nameTooLong",
  "descriptionTooLong",
  "outputInvalid",
  "yieldInvalid",
  "unitInvalid",
  "portionInvalid",
  "minutesInvalid",
  "instructionsTooLong",
  "noteTooLong",
  "itemRequired",
  "quantityInvalid",
  "lossInvalid",
  "operationNameRequired",
  "durationInvalid",
  "activeMinutesInvalid",
] as const;

export type RecipeValidationKey = (typeof recipeValidationKeys)[number];

export type TranslateRecipeValidation = (
  key: RecipeValidationKey,
) => string;

const optionalInteger = (
  message: string,
  min: number,
  max: number,
) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (/^\d+$/.test(value) &&
          Number(value) >= min &&
          Number(value) <= max),
      message,
    );

export function recipeInputSchema(t: TranslateRecipeValidation) {
  return z.object({
    code: z
      .string()
      .trim()
      .refine(
        (value) => /^[A-Za-z0-9][A-Za-z0-9-]{1,31}$/.test(value),
        t("codeInvalid"),
      ),
    name: z
      .string()
      .trim()
      .min(2, t("nameRequired"))
      .max(120, t("nameTooLong")),
    description: z.string().trim().max(500, t("descriptionTooLong")),
    outputItemId: z.string().trim().min(1, t("outputInvalid")),
  });
}

export type RecipeInputValues = z.infer<
  ReturnType<typeof recipeInputSchema>
>;

export function recipeVersionInputSchema(t: TranslateRecipeValidation) {
  return z.object({
    yieldQuantity: decimalString({
      message: t("yieldInvalid"),
      min: 0.0001,
      max: 1000000,
      scale: 4,
    }),
    yieldUnitId: z.string().trim().min(1, t("unitInvalid")),
    portionCount: optionalInteger(t("portionInvalid"), 0, 1000000),
    prepMinutes: optionalInteger(t("minutesInvalid"), 0, 100000),
    cookMinutes: optionalInteger(t("minutesInvalid"), 0, 100000),
    instructions: z
      .string()
      .trim()
      .max(10000, t("instructionsTooLong")),
    changeNote: z.string().trim().max(500, t("noteTooLong")),
  });
}

export type RecipeVersionInputValues = z.infer<
  ReturnType<typeof recipeVersionInputSchema>
>;

export function recipeLineInputSchema(t: TranslateRecipeValidation) {
  return z.object({
    itemId: z.string().trim().min(1, t("itemRequired")),
    quantity: decimalString({
      message: t("quantityInvalid"),
      min: 0,
      max: 1000000,
      scale: 4,
    }).refine((value) => Number(value) > 0, t("quantityInvalid")),
    unitId: z.string().trim().min(1, t("unitInvalid")),
    lossPct: decimalString({
      message: t("lossInvalid"),
      min: 0,
      max: 100,
      scale: 2,
    }),
    isOptional: z.boolean(),
    note: z.string().trim().max(200, t("noteTooLong")),
  });
}

export type RecipeLineInputValues = z.infer<
  ReturnType<typeof recipeLineInputSchema>
>;

export function recipeOperationInputSchema(t: TranslateRecipeValidation) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(2, t("operationNameRequired"))
      .max(80, t("nameTooLong")),
    description: z.string().trim().max(500, t("descriptionTooLong")),
    durationMinutes: z
      .string()
      .trim()
      .refine(
        (value) =>
          /^\d+$/.test(value) &&
          Number(value) > 0 &&
          Number(value) <= 100000,
        t("durationInvalid"),
      ),
    activeMinutes: optionalInteger(t("activeMinutesInvalid"), 0, 100000),
    equipmentId: z.string().trim(),
    labourRateId: z.string().trim(),
    requiredSkillId: z.string().trim(),
  });
}

export type RecipeOperationInputValues = z.infer<
  ReturnType<typeof recipeOperationInputSchema>
>;

export const recipeIdSchema = z.object({id: z.string().trim().min(1)});
export const recipeVersionIdSchema = z.object({
  id: z.string().trim().min(1),
});
export const recipeLineIdSchema = z.object({
  versionId: z.string().trim().min(1),
  lineId: z.string().trim().min(1),
});
export const recipeOperationIdSchema = z.object({
  versionId: z.string().trim().min(1),
  operationId: z.string().trim().min(1),
});
