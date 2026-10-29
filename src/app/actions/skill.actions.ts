"use server";

import {getActorContext} from "@/server/auth/actor";
import {skillService} from "@/server/services/container";
import type {SkillLevelName} from "@/lib/dto";
import {
  createSkillSchema,
  employeeSkillIdSchema,
  employeeSkillInputSchema,
  skillIdSchema,
} from "@/server/validators/skill.schema";
import {mapDomainError, type ActionErrorKey} from "./errors";

export type SkillActionResult =
  | {ok: true}
  | {ok: false; error: ActionErrorKey};

export async function createSkillAction(
  input: unknown,
): Promise<SkillActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = createSkillSchema((key) => key).safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await skillService.createSkill(actor, {
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description || null,
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function archiveSkillAction(
  input: unknown,
): Promise<SkillActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = skillIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await skillService.archiveSkill(actor, parsed.data.id);
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function addEmployeeSkillAction(
  employeeId: unknown,
  input: unknown,
): Promise<SkillActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = skillIdSchema.safeParse({id: employeeId});
  const parsed = employeeSkillInputSchema((key) => key).safeParse(input);
  if (!parsedId.success || !parsed.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await skillService.addEmployeeSkill(actor, parsedId.data.id, {
      skillId: parsed.data.skillId,
      level: parsed.data.level as SkillLevelName,
      certifiedOn: parsed.data.certifiedOn
        ? new Date(`${parsed.data.certifiedOn}T00:00:00.000Z`)
        : null,
    });
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function removeEmployeeSkillAction(
  input: unknown,
): Promise<SkillActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsed = employeeSkillIdSchema.safeParse(input);
  if (!parsed.success) return {ok: false, error: "invalidInput"};

  try {
    await skillService.removeEmployeeSkill(
      actor,
      parsed.data.employeeId,
      parsed.data.id,
    );
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}
