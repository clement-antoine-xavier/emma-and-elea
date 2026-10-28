import type {CustomerInput} from "@/server/repositories/customer.repository";

function orNull(value: string): string | null {
  return value.trim() === "" ? null : value;
}

/** Maps the validated form/API shape to the repository input. */
export function toCustomerInput(input: {
  code: string;
  name: string;
  type: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  vatNumber: string;
  note: string;
}): CustomerInput {
  return {
    code: input.code ? input.code.toUpperCase() : null,
    name: input.name,
    type: input.type as "BUSINESS" | "INDIVIDUAL",
    contactName: orNull(input.contactName),
    email: orNull(input.email),
    phone: orNull(input.phone),
    city: orNull(input.city),
    vatNumber: orNull(input.vatNumber),
    note: orNull(input.note),
  };
}
