import type {McpServer} from "@modelcontextprotocol/server";
import type {OrganizationActor} from "@/server/auth/types";
import {
  taskAssignSchema,
  taskFiltersSchema,
  taskStatusSchema,
  taskSuggestionSchema,
} from "@/server/validators/api.schema";
import {runTool} from "../result";
import {executeScope, readScope, writeScope, type McpDeps} from "./shared";

export function registerTaskTools(
  server: McpServer,
  actor: OrganizationActor,
  deps: McpDeps,
) {
  server.registerTool(
    "list_tasks",
    {
      description:
        "List the production tasks of a seven-day window, with their batch, assignee and status, plus the assignable employees.",
      inputSchema: taskFiltersSchema,
      scopeChallenge: readScope,
    },
    async ({date}) => runTool(() => deps.task.getTasks(actor, date)),
  );

  server.registerTool(
    "get_my_work",
    {
      description:
        "List the tasks assigned to the signed-in member's employee profile for a seven-day window.",
      inputSchema: taskFiltersSchema,
      scopeChallenge: readScope,
    },
    async ({date}) => runTool(() => deps.task.getMyWork(actor, date)),
  );

  server.registerTool(
    "suggest_task_assignee",
    {
      description:
        "Suggest the best employee for a task: eligible for the skill, available, and with the lightest workload. Assignment stays explicit.",
      inputSchema: taskSuggestionSchema,
      scopeChallenge: writeScope,
    },
    async ({taskId}) =>
      runTool(async () => ({
        employeeId: await deps.task.suggestEmployee(actor, taskId),
      })),
  );

  server.registerTool(
    "assign_task",
    {
      description:
        "Assign a task to an employee profile, or unassign it with an empty employee id. Assignment checks skill, availability, absences and overlaps.",
      inputSchema: taskAssignSchema,
      scopeChallenge: writeScope,
    },
    async ({taskId, employeeId}) =>
      runTool(() =>
        deps.task.assignTask(actor, taskId, employeeId ? employeeId : null),
      ),
  );

  server.registerTool(
    "set_task_status",
    {
      description:
        "Move a task to TODO, IN_PROGRESS, DONE or BLOCKED. Staff may only change their own tasks.",
      inputSchema: taskStatusSchema,
      scopeChallenge: executeScope,
    },
    async ({taskId, status}) =>
      runTool(() => deps.task.setTaskStatus(actor, taskId, status)),
  );
}
