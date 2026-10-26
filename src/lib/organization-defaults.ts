import { prisma } from "./prisma";

/**
 * Per-organization bootstrap. Costing and waste recording both need these
 * rows, so they are created with the organization rather than lazily on first
 * use. The function is idempotent and can be re-run to repair a tenant.
 *
 * Called from the Better Auth `organization.create.after` hook in
 * `src/lib/auth.ts`; see `docs/ERD.md`, implementation notes.
 */

export interface DefaultLossReason {
  code: string;
  labelFr: string;
  labelEn: string;
  category:
    | "OVERPRODUCTION"
    | "EXPIRED"
    | "BREAKAGE"
    | "QUALITY"
    | "TRIMMING"
    | "STAFF_MEAL"
    | "DONATION"
    | "OTHER";
  sortOrder: number;
}

export const DEFAULT_LOSS_REASONS: readonly DefaultLossReason[] = [
  {
    code: "OVERPRODUCTION",
    labelFr: "Invendus",
    labelEn: "Unsold goods",
    category: "OVERPRODUCTION",
    sortOrder: 10,
  },
  {
    code: "EXPIRED",
    labelFr: "Périmé",
    labelEn: "Expired",
    category: "EXPIRED",
    sortOrder: 20,
  },
  {
    code: "BREAKAGE",
    labelFr: "Casse",
    labelEn: "Breakage",
    category: "BREAKAGE",
    sortOrder: 30,
  },
  {
    code: "QUALITY",
    labelFr: "Défaut qualité",
    labelEn: "Quality issue",
    category: "QUALITY",
    sortOrder: 40,
  },
  {
    code: "TRIMMING",
    labelFr: "Parures et chutes",
    labelEn: "Trimming and scraps",
    category: "TRIMMING",
    sortOrder: 50,
  },
  {
    code: "STAFF_MEAL",
    labelFr: "Repas du personnel",
    labelEn: "Staff meal",
    category: "STAFF_MEAL",
    sortOrder: 60,
  },
  {
    code: "DONATION",
    labelFr: "Don",
    labelEn: "Donation",
    category: "DONATION",
    sortOrder: 70,
  },
  {
    code: "OTHER",
    labelFr: "Autre",
    labelEn: "Other",
    category: "OTHER",
    sortOrder: 80,
  },
];

/**
 * Creates the organization's settings row and its default loss reasons.
 * Safe to call more than once: settings are upserted and loss reasons are
 * inserted with `skipDuplicates` against `@@unique([organizationId, code])`.
 */
export async function ensureOrganizationDefaults(
  organizationId: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.organizationSetting.upsert({
      where: { organizationId },
      create: { organizationId },
      update: {},
    }),
    prisma.lossReason.createMany({
      data: DEFAULT_LOSS_REASONS.map((reason) => ({
        organizationId,
        code: reason.code,
        labelFr: reason.labelFr,
        labelEn: reason.labelEn,
        category: reason.category,
        sortOrder: reason.sortOrder,
      })),
      skipDuplicates: true,
    }),
  ]);
}
