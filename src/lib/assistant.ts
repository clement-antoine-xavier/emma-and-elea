/**
 * Client-safe assistant metadata. Keep this module free of server imports: the
 * drawer and the route handler both consume it.
 */

export type AssistantPersona = "emma" | "elea";

export type PersonaDefinition = {
  id: AssistantPersona;
  name: string;
  tagline: {en: string; fr: string};
  intro: {en: string; fr: string};
  accent: "amber" | "teal";
};

export const PERSONAS: Record<AssistantPersona, PersonaDefinition> = {
  emma: {
    id: "emma",
    name: "Emma",
    tagline: {
      en: "Revenue & customers",
      fr: "Ventes et clients",
    },
    intro: {
      en: "I look after customers, orders, deliveries and daily sales.",
      fr: "Je m’occupe des clients, des commandes, des livraisons et des ventes.",
    },
    accent: "amber",
  },
  elea: {
    id: "elea",
    name: "Éléa",
    tagline: {
      en: "Production & operations",
      fr: "Production et opérations",
    },
    intro: {
      en: "I look after production, stock, purchasing, recipes, costs and the team.",
      fr: "Je m’occupe de la production, du stock, des achats, des recettes, des coûts et de l’équipe.",
    },
    accent: "teal",
  },
};

/** Tools that change a posted ledger, publish something, or decide a request. */
export const GATED_TOOLS = [
  "confirm_order",
  "cancel_order",
  "post_dispatch",
  "cancel_dispatch",
  "archive_customer",
  "confirm_production_plan",
  "close_production_plan",
  "cancel_production_plan",
  "start_production_batch",
  "complete_production_batch",
  "cancel_production_batch",
  "record_waste",
  "archive_waste",
  "post_receipt",
  "cancel_receipt",
  "post_stock_count",
  "publish_recipe_version",
  "archive_recipe",
  "decide_absence",
  "archive_supplier",
  "archive_catalog_item",
  "archive_category",
] as const;

export type GatedTool = (typeof GATED_TOOLS)[number];

const gated = new Set<string>(GATED_TOOLS);

export function isGatedTool(name: string): boolean {
  return gated.has(name);
}

export const TOOL_LABELS: Record<string, {en: string; fr: string}> = {
  whoami: {en: "Reading your workspace", fr: "Lecture de votre espace"},
  get_daily_briefing: {en: "Preparing your briefing", fr: "Préparation de votre point"},
  list_sites: {en: "Checking sites", fr: "Consultation des sites"},
  list_catalog_items: {en: "Searching the catalog", fr: "Recherche dans le catalogue"},
  get_catalog_item: {en: "Reading the item", fr: "Lecture de l’article"},
  list_customers: {en: "Searching customers", fr: "Recherche des clients"},
  get_customer: {en: "Reading the customer", fr: "Lecture du client"},
  list_orders: {en: "Checking orders", fr: "Consultation des commandes"},
  get_order: {en: "Reading the order", fr: "Lecture de la commande"},
  create_order: {en: "Creating a draft order", fr: "Création d’un brouillon de commande"},
  add_order_line: {en: "Adding an order line", fr: "Ajout d’une ligne de commande"},
  remove_order_line: {en: "Removing an order line", fr: "Suppression d’une ligne de commande"},
  confirm_order: {en: "Confirming the order", fr: "Confirmation de la commande"},
  cancel_order: {en: "Cancelling the order", fr: "Annulation de la commande"},
  list_dispatches: {en: "Checking deliveries", fr: "Consultation des livraisons"},
  get_dispatch: {en: "Reading the delivery", fr: "Lecture de la livraison"},
  create_dispatch: {en: "Creating a delivery draft", fr: "Création d’un brouillon de livraison"},
  add_dispatch_line: {en: "Adding a delivery line", fr: "Ajout d’une ligne de livraison"},
  remove_dispatch_line: {en: "Removing a delivery line", fr: "Suppression d’une ligne de livraison"},
  post_dispatch: {en: "Posting the delivery", fr: "Validation de la livraison"},
  cancel_dispatch: {en: "Cancelling the delivery", fr: "Annulation de la livraison"},
  list_daily_sales: {en: "Reading daily sales", fr: "Lecture des ventes quotidiennes"},
  record_daily_sales: {en: "Recording daily sales", fr: "Enregistrement des ventes"},
  list_production_batches: {en: "Checking production", fr: "Consultation de la production"},
  get_production_batch: {en: "Reading the batch", fr: "Lecture du lot de production"},
  create_production_batch: {en: "Creating a batch", fr: "Création d’un lot"},
  start_production_batch: {en: "Starting the batch", fr: "Démarrage du lot"},
  complete_production_batch: {en: "Completing the batch", fr: "Clôture du lot"},
  cancel_production_batch: {en: "Cancelling the batch", fr: "Annulation du lot"},
  get_production_board: {en: "Reading the planning board", fr: "Lecture du tableau de planification"},
  get_production_plan: {en: "Reading the plan", fr: "Lecture du plan"},
  create_production_plan: {en: "Creating a plan", fr: "Création d’un plan"},
  add_production_plan_line: {en: "Adding a plan line", fr: "Ajout d’une ligne de plan"},
  update_production_plan_line: {en: "Updating a plan line", fr: "Mise à jour d’une ligne de plan"},
  remove_production_plan_line: {en: "Removing a plan line", fr: "Suppression d’une ligne de plan"},
  confirm_production_plan: {en: "Confirming the plan", fr: "Confirmation du plan"},
  close_production_plan: {en: "Closing the plan", fr: "Clôture du plan"},
  cancel_production_plan: {en: "Cancelling the plan", fr: "Annulation du plan"},
  create_batch_from_plan_line: {en: "Creating a batch from the plan", fr: "Création d’un lot depuis le plan"},
  get_stock_levels: {en: "Checking stock", fr: "Consultation du stock"},
  list_stock_lots: {en: "Checking lots and expiry", fr: "Consultation des lots et dates"},
  get_stock_lot: {en: "Reading the lot", fr: "Lecture du lot"},
  list_stock_counts: {en: "Checking stock counts", fr: "Consultation des inventaires"},
  get_stock_count: {en: "Reading the stock count", fr: "Lecture de l’inventaire"},
  create_stock_count: {en: "Opening a stock count", fr: "Ouverture d’un inventaire"},
  update_stock_count_lines: {en: "Recording counted quantities", fr: "Saisie des quantités comptées"},
  post_stock_count: {en: "Posting the stock count", fr: "Validation de l’inventaire"},
  cancel_stock_count: {en: "Cancelling the stock count", fr: "Annulation de l’inventaire"},
  list_receipts: {en: "Checking goods receipts", fr: "Consultation des réceptions"},
  get_receipt: {en: "Reading the receipt", fr: "Lecture de la réception"},
  create_receipt_draft: {en: "Creating a receipt draft", fr: "Création d’un brouillon de réception"},
  add_receipt_line: {en: "Adding a receipt line", fr: "Ajout d’une ligne de réception"},
  remove_receipt_line: {en: "Removing a receipt line", fr: "Suppression d’une ligne de réception"},
  post_receipt: {en: "Posting the receipt", fr: "Validation de la réception"},
  cancel_receipt: {en: "Cancelling the receipt", fr: "Annulation de la réception"},
  list_suppliers: {en: "Checking suppliers", fr: "Consultation des fournisseurs"},
  get_supplier: {en: "Reading the supplier", fr: "Lecture du fournisseur"},
  list_recipes: {en: "Checking recipes", fr: "Consultation des recettes"},
  get_recipe: {en: "Reading the recipe", fr: "Lecture de la recette"},
  create_recipe: {en: "Creating a recipe", fr: "Création d’une recette"},
  create_recipe_version: {en: "Creating a recipe version", fr: "Création d’une version de recette"},
  update_recipe_version: {en: "Updating the recipe version", fr: "Mise à jour de la version"},
  add_recipe_line: {en: "Adding an ingredient", fr: "Ajout d’un ingrédient"},
  add_recipe_operation: {en: "Adding an operation", fr: "Ajout d’une opération"},
  publish_recipe_version: {en: "Publishing the recipe", fr: "Publication de la recette"},
  archive_recipe: {en: "Archiving the recipe", fr: "Archivage de la recette"},
  get_reports: {en: "Reading the reports", fr: "Lecture des rapports"},
  get_dashboard_kpis: {en: "Reading the KPIs", fr: "Lecture des indicateurs"},
  get_team: {en: "Checking the team", fr: "Consultation de l’équipe"},
  get_employees: {en: "Checking employees", fr: "Consultation des employés"},
  get_schedule: {en: "Reading the schedule", fr: "Lecture du planning"},
  get_absences: {en: "Checking absences", fr: "Consultation des absences"},
  create_absence: {en: "Recording an absence request", fr: "Enregistrement d’une demande d’absence"},
  decide_absence: {en: "Deciding on the absence", fr: "Décision sur l’absence"},
  create_shift: {en: "Creating a shift", fr: "Création d’un créneau"},
  assign_shift: {en: "Assigning a shift", fr: "Affectation d’un créneau"},
  list_sites_settings: {en: "Checking settings", fr: "Consultation des réglages"},
  get_production_options: {en: "Checking production options", fr: "Consultation des options de production"},
  get_order_options: {en: "Checking order options", fr: "Consultation des options de commande"},
  get_receipt_form_options: {en: "Checking receipt options", fr: "Consultation des options de réception"},
  get_waste_options: {en: "Checking waste reasons", fr: "Consultation des motifs de perte"},
  record_waste: {en: "Recording waste", fr: "Enregistrement d’une perte"},
  archive_waste: {en: "Archiving waste", fr: "Archivage d’une perte"},
  get_lot_trace: {en: "Tracing the lot", fr: "Traçabilité du lot"},
  get_settings: {en: "Checking settings", fr: "Consultation des réglages"},
  get_equipment: {en: "Checking equipment", fr: "Consultation de l’équipement"},
  get_rates: {en: "Checking labour and energy rates", fr: "Consultation des taux et tarifs"},
  request_persona_switch: {en: "Checking who can help", fr: "Vérification de l’interlocuteur"},
};

export function toolLabel(
  name: string,
  locale: "en" | "fr",
): string {
  return TOOL_LABELS[name]?.[locale] ?? name.replaceAll("_", " ");
}

export type AssistantStreamEvent =
  | {type: "start"; runId: string; conversationId: string}
  | {type: "text"; delta: string}
  | {
      type: "tool";
      phase: "start" | "end";
      name: string;
      label: string;
      status?: "ok" | "error";
    }
  | {
      type: "approval";
      approvalId: string;
      toolName: string;
      preview: AssistantApprovalPreview;
    }
  | {type: "handoff"; persona: AssistantPersona; reason: string}
  | {type: "done"; conversationId: string; runId: string}
  | {type: "error"; code: string; message: string};

export type AssistantApprovalPreview = {
  title: string;
  summary: string;
  facts: ReadonlyArray<{label: string; value: string}>;
  warning?: string;
  href?: string;
};

export type AssistantHistoryMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};
