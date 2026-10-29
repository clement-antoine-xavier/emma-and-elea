# 0026. Generate production tasks from recipe operations

- Status: Accepted
- Deciders: Clement Antoine-Xavier
- Date: 2026-10-29

## Context and Problem Statement

The team model already had `Skill`, `EmployeeSkill` and `ProductionTask`, but no
service wrote them. The product promise is that operations become tasks assigned
to people with the right skill, availability and workload. How should tasks be
created and assigned without duplicating the recipe on every batch?

## Decision Drivers

- Recipes already describe the operations, their durations and their equipment.
- Task generation must be idempotent: retries must not duplicate rows.
- Assignment must respect skills, declared availability, approved absences and
  overlapping tasks, using the same schedule rules as shifts (ADR-0017).
- Staff need a personal view; managers need a week view and a suggestion.
- Permissions already exist (`task:read`, `task:write`, `task:execute`).

## Considered Options

- Store tasks only on the plan and edit them by hand
- Generate one task per recipe operation when a batch is created
- Generate tasks from a separate task-template model
- Generate tasks from calendar events

## Decision Outcome

Chosen option: "One task per recipe operation at batch creation", because it
keeps the recipe as the single source of truth and needs no template model.

- `RecipeOperation.requiredSkillId` is nullable and set to `SET NULL` on delete.
- Creating a batch (directly or from a planning line) calls
  `taskRepository.generateForBatch`. Tasks inherit the operation name,
  description, active/duration minutes, position and required skill.
- When the batch has a planned start, tasks are scheduled sequentially from it.
- A unique `(productionBatchId, position)` index plus `createMany({
  skipDuplicates: true })` makes generation idempotent.
- Assignment validates the skill, the employee availability window, approved
  absences and overlapping tasks. Violations surface as `EMPLOYEE_UNAVAILABLE`
  or `SHIFT_CONFLICT`.
- “Suggest” ranks eligible employees by skill level, open task count and name;
  it still requires an explicit assignment call.
- Staff can change the status only of tasks assigned to their own employee
  profile; managers with `task:write` can change any task.

### Positive Consequences

- Tasks never diverge from the recipe operation that produced them.
- The assignment rules are shared with the schedule domain and unit-tested.
- `/dashboard/my-work` gives staff their own list.

### Negative Consequences

- Editing a task does not edit the recipe; a new batch is needed to regenerate.
- One skill per operation is a deliberate v1 limit.
- Unscheduled batches produce unscheduled tasks, so time checks are skipped.

## Links

- Related ADR: ADR-0017 (schedule against availability), ADR-0011 (permissions)
- Source: `src/server/repositories/task.repository.ts`,
  `src/server/services/task.service.ts`, `src/server/services/workload.service.ts`
