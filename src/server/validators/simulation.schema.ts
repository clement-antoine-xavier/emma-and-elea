import {z} from "zod";

export const simulationValidationKeys = [
  "percentInvalid",
  "priceInvalid",
] as const;

export type SimulationValidationKey =
  (typeof simulationValidationKeys)[number];

export type TranslateSimulationValidation = (
  key: SimulationValidationKey,
) => string;

const percent = (message: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        /^-?\d+(?:\.\d{1,2})?$/.test(value) &&
        Number(value) >= -100 &&
        Number(value) <= 300,
      message,
    );

export function createSimulationSchema(t: TranslateSimulationValidation) {
  return z.object({
    materialPct: percent(t("percentInvalid")),
    packagingPct: percent(t("percentInvalid")),
    labourPct: percent(t("percentInvalid")),
    energyPct: percent(t("percentInvalid")),
    salePrice: z
      .string()
      .trim()
      .refine(
        (value) =>
          value === "" ||
          (/^\d+(?:\.\d{1,4})?$/.test(value) &&
            Number(value) > 0 &&
            Number(value) <= 10000000),
        t("priceInvalid"),
      ),
  });
}

export type SimulationValues = z.infer<
  ReturnType<typeof createSimulationSchema>
>;
