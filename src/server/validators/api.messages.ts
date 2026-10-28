import {
  type CatalogValidationKey,
  type TranslateCatalogValidation,
} from "@/server/validators/catalog.schema";
import {
  type CustomerValidationKey,
  type TranslateCustomerValidation,
} from "@/server/validators/customer.schema";
import {
  type PlanningValidationKey,
  type TranslatePlanningValidation,
} from "@/server/validators/planning.schema";
import {
  type ProductionValidationKey,
  type TranslateProductionValidation,
} from "@/server/validators/production.schema";
import {
  type PurchasingValidationKey,
  type TranslatePurchasingValidation,
} from "@/server/validators/purchasing.schema";
import {
  type RecipeValidationKey,
  type TranslateRecipeValidation,
} from "@/server/validators/recipe.schema";
import {
  type SalesValidationKey,
  type TranslateSalesValidation,
} from "@/server/validators/sales.schema";
import {
  type SupplierValidationKey,
  type TranslateSupplierValidation,
} from "@/server/validators/supplier.schema";

/**
 * The domain validators are parameterized by a translator so the UI can render
 * localized messages. MCP never imports `next-intl`; it passes a stable English
 * map instead so an agent gets an actionable error string.
 */
const catalog = {
  nameRequired: "Name is required (2 characters minimum).",
  nameTooLong: "Name is too long (120 characters maximum).",
  codeInvalid: "Code must contain 2-32 letters, digits or dashes.",
  descriptionTooLong: "Description is too long (500 characters maximum).",
  typeInvalid: "Type is not a valid item type.",
  categoryInvalid: "Category is not valid.",
  stockUnitRequired: "A stock unit is required.",
  salePriceInvalid: "Sale price is not a valid amount.",
  vatInvalid: "VAT rate must be between 0 and 100 with 2 decimals.",
  shelfLifeInvalid: "Shelf life must be a whole number of days.",
  quantityInvalid: "Quantity is not a valid amount.",
  channelInvalid: "Sales channel is not valid.",
  categoryNameRequired: "Category name is required (2 characters minimum).",
  categoryNameTooLong: "Category name is too long (60 characters maximum).",
  parentInvalid: "Parent category is not valid.",
  sortOrderInvalid: "Sort order must be a whole number.",
  allergenInvalid: "Allergen is not valid.",
  presenceInvalid: "Allergen presence must be CONTAINS or MAY_CONTAIN.",
  noteTooLong: "Note is too long.",
} as const satisfies Record<CatalogValidationKey, string>;

const supplier = {
  codeInvalid: "Supplier code must contain 2-16 letters, digits or dashes.",
  nameRequired: "Supplier name is required.",
  nameTooLong: "Text field is too long.",
  emailInvalid: "Email address is not valid.",
  phoneTooLong: "Phone number is too long.",
  cityTooLong: "City is too long.",
  leadTimeInvalid: "Lead time must be a whole number of days (365 maximum).",
  noteTooLong: "Note is too long.",
  itemRequired: "An item is required.",
  packQuantityInvalid: "Pack quantity is not a valid amount.",
  priceInvalid: "Price is not a valid amount.",
  dateInvalid: "Date must be YYYY-MM-DD.",
  minOrderInvalid: "Minimum order quantity is not valid.",
  refTooLong: "Reference is too long.",
} as const satisfies Record<SupplierValidationKey, string>;

const customer = {
  nameRequired: "Customer name is required.",
  nameTooLong: "Text field is too long.",
  codeInvalid: "Customer code is not valid.",
  typeInvalid: "Customer type must be BUSINESS or INDIVIDUAL.",
  emailInvalid: "Email address is not valid.",
  phoneTooLong: "Phone number is too long.",
  cityTooLong: "City is too long.",
  vatTooLong: "VAT number is too long.",
  noteTooLong: "Note is too long.",
} as const satisfies Record<CustomerValidationKey, string>;

const purchasing = {
  siteRequired: "A site is required.",
  supplierRequired: "A supplier is required.",
  referenceTooLong: "Supplier reference is too long.",
  noteTooLong: "Note is too long.",
  itemRequired: "An item is required.",
  quantityInvalid: "Quantity must be greater than zero.",
  unitRequired: "A unit is required.",
  unitPriceInvalid: "Unit price is not a valid amount.",
  dateInvalid: "Date must be YYYY-MM-DD.",
  lotTooLong: "Lot number is too long.",
} as const satisfies Record<PurchasingValidationKey, string>;

const production = {
  siteRequired: "A site is required.",
  recipeRequired: "A recipe version is required.",
  quantityInvalid: "Quantity must be greater than zero.",
  dateInvalid: "Date must be YYYY-MM-DD.",
  noteTooLong: "Note is too long (300 characters maximum).",
  lotRequired: "A stock lot is required.",
  reasonRequired: "A loss reason is required.",
  itemRequired: "An item is required.",
} as const satisfies Record<ProductionValidationKey, string>;

const planning = {
  siteRequired: "A site is required.",
  dateInvalid: "Date must be YYYY-MM-DD.",
  noteTooLong: "Note is too long.",
  itemRequired: "An item is required.",
  quantityInvalid: "Quantity must be greater than zero.",
  lineRequired: "A plan line is required.",
} as const satisfies Record<PlanningValidationKey, string>;

const recipe = {
  codeInvalid: "Code must contain 2-32 letters, digits or dashes.",
  nameRequired: "Recipe name is required (2 characters minimum).",
  nameTooLong: "Recipe name is too long (120 characters maximum).",
  descriptionTooLong: "Description is too long (500 characters maximum).",
  outputInvalid: "An output item is required.",
  yieldInvalid: "Yield must be greater than zero.",
  unitInvalid: "A unit is required.",
  portionInvalid: "Portion count must be a whole number.",
  minutesInvalid: "Minutes must be a whole number.",
  instructionsTooLong: "Instructions are too long.",
  noteTooLong: "Note is too long.",
  itemRequired: "An ingredient is required.",
  quantityInvalid: "Quantity must be greater than zero.",
  lossInvalid: "Loss must be between 0 and 100.",
  operationNameRequired: "Operation name is required.",
  durationInvalid: "Duration must be a positive whole number of minutes.",
  activeMinutesInvalid: "Active minutes must be a whole number.",
} as const satisfies Record<RecipeValidationKey, string>;

const sales = {
  customerRequired: "A customer is required.",
  siteRequired: "A site is required.",
  dateInvalid: "Date must be YYYY-MM-DD.",
  noteTooLong: "Note is too long.",
  itemRequired: "An item is required.",
  quantityInvalid: "Quantity must be greater than zero.",
  unitRequired: "A unit is required.",
  priceInvalid: "Price is not a valid amount.",
  lotRequired: "A stock lot is required.",
  channelInvalid: "Sales channel is not valid.",
  revenueInvalid: "Revenue is not a valid amount.",
} as const satisfies Record<SalesValidationKey, string>;

const catalogKeys: TranslateCatalogValidation = (key) => catalog[key];
const supplierKeys: TranslateSupplierValidation = (key) => supplier[key];
const customerKeys: TranslateCustomerValidation = (key) => customer[key];
const purchasingKeys: TranslatePurchasingValidation = (key) => purchasing[key];
const productionKeys: TranslateProductionValidation = (key) => production[key];
const planningKeys: TranslatePlanningValidation = (key) => planning[key];
const salesKeys: TranslateSalesValidation = (key) => sales[key];
const recipeKeys: TranslateRecipeValidation = (key) => recipe[key];

export const apiValidation = {
  catalog: catalogKeys,
  supplier: supplierKeys,
  customer: customerKeys,
  purchasing: purchasingKeys,
  production: productionKeys,
  planning: planningKeys,
  sales: salesKeys,
  recipe: recipeKeys,
} as const;
