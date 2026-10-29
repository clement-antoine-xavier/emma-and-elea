"use server";

import {z} from "zod";
import type {TaskStatusName} from "@/lib/dto";
import {getActorContext} from "@/server/auth/actor";
import {taskService} from "@/server/services/container";
import {mapDomainError, type ActionErrorKey} from "./errors";

const statusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]);

export type TaskActionResult =
  | {ok: true}
  | {ok: false; error: ActionErrorKey};

export type TaskSuggestionResult =
  | {ok: true; employeeId: string | null}
  | {ok: false; error: ActionErrorKey};

export async function assignTaskAction(
  taskId: unknown,
  employeeId: unknown,
): Promise<TaskActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = z.string().trim().min(1).safeParse(taskId);
  const parsedEmployee =
    employeeId === null || employeeId === ""
      ? {success: true as const, data: null}
      : z.string().trim().min(1).safeParse(employeeId);
  if (!parsedId.success || !parsedEmployee.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await taskService.assignTask(
      actor,
      parsedId.data,
      parsedEmployee.data,
    );
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function setTaskStatusAction(
  taskId: unknown,
  status: unknown,
): Promise<TaskActionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = z.string().trim().min(1).safeParse(taskId);
  const parsedStatus = statusSchema.safeParse(status);
  if (!parsedId.success || !parsedStatus.success) {
    return {ok: false, error: "invalidInput"};
  }

  try {
    await taskService.setTaskStatus(
      actor,
      parsedId.data,
      parsedStatus.data as TaskStatusName,
    );
    return {ok: true};
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}

export async function suggestTaskAction(
  taskId: unknown,
): Promise<TaskSuggestionResult> {
  const actor = await getActorContext();
  if (!actor) return {ok: false, error: "unauthenticated"};

  const parsedId = z.string().trim().min(1).safeParse(taskId);
  if (!parsedId.success) return {ok: false, error: "invalidInput"};

  try {
    return {
      ok: true,
      employeeId: await taskService.suggestEmployee(actor, parsedId.data),
    };
  } catch (error) {
    return {ok: false, error: mapDomainError(error)};
  }
}
