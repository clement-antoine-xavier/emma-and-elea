import {GATED_TOOLS} from "@/lib/assistant";
import type {Permission} from "@/lib/permissions";
import {actorFor} from "@/test-utils/actor";
import {
  CAPABILITY_DEFINITIONS,
  personaAvailable,
  personaHasDomainTools,
  toolNamesFor,
} from "./catalog";

function namesFor(
  role: Parameters<typeof actorFor>[0],
  persona: "emma" | "elea",
) {
  const actor = actorFor(role);

  return new Set(
    toolNamesFor(persona, (permission) => actor.scopes!.has(permission)),
  );
}

describe("assistant capabilities", () => {
  it("gives sales the commercial tools and hides production", () => {
    const names = namesFor("sales", "emma");

    expect(names.has("list_orders")).toBe(true);
    expect(names.has("create_order")).toBe(true);
    expect(names.has("post_dispatch")).toBe(true);
    expect(names.has("list_production_batches")).toBe(false);
    expect(names.has("post_receipt")).toBe(false);
  });

  it("gives staff the execution tools but no financial reporting", () => {
    const names = namesFor("staff", "elea");

    expect(names.has("start_production_batch")).toBe(true);
    expect(names.has("record_waste")).toBe(true);
    expect(names.has("create_stock_count")).toBe(true);
    expect(names.has("post_stock_count")).toBe(false);
    expect(names.has("get_reports")).toBe(false);
    expect(names.has("decide_absence")).toBe(false);
  });

  it("gives the stock manager purchasing writes without customer writes", () => {
    const elea = namesFor("stock_manager", "elea");
    const emma = namesFor("stock_manager", "emma");

    expect(elea.has("post_receipt")).toBe(true);
    expect(elea.has("create_receipt_draft")).toBe(true);
    expect(emma.has("list_orders")).toBe(true);
    expect(emma.has("create_order")).toBe(false);
    expect(emma.has("create_customer")).toBe(false);
  });

  it("gives the accountant finance reads and no writes", () => {
    const names = namesFor("accountant", "elea");

    expect(names.has("get_reports")).toBe(true);
    expect(names.has("list_recipes")).toBe(true);
    expect(names.has("publish_recipe_version")).toBe(false);
    expect(names.has("post_receipt")).toBe(false);
  });

  it("gives the auditor traceability without cost reports", () => {
    const names = namesFor("auditor", "elea");

    expect(names.has("get_lot_trace")).toBe(true);
    expect(names.has("get_reports")).toBe(false);
    expect(names.has("post_receipt")).toBe(false);
  });

  it("hides Emma from staff, who only have production tools", () => {
    const actor = actorFor("staff");
    const can = (permission: Permission) => actor.scopes!.has(permission);

    expect(personaHasDomainTools("emma", can)).toBe(false);
    expect(personaHasDomainTools("elea", can)).toBe(true);
  });

  it("exposes both personas to the production manager", () => {
    const actor = actorFor("production_manager");
    const can = (permission: Permission) => actor.scopes!.has(permission);

    expect(personaAvailable("emma", can)).toBe(true);
    expect(personaAvailable("elea", can)).toBe(true);
  });

  it("marks every gated tool as present in the catalogue", () => {
    const all = new Set(
      CAPABILITY_DEFINITIONS.flatMap((capability) => capability.tools),
    );

    for (const gated of GATED_TOOLS) {
      expect(all.has(gated)).toBe(true);
    }
  });
});
