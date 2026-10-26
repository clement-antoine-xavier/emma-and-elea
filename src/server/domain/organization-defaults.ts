/**
 * Default rows created with every organization. Costing and waste recording
 * need them, so they are bootstrapped rather than created lazily.
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
