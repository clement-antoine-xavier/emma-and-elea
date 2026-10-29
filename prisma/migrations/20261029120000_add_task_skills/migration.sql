-- Recipe operations can require one skill; generated production tasks inherit it.
ALTER TABLE "recipe_operation" ADD COLUMN "requiredSkillId" TEXT;

CREATE INDEX "recipe_operation_requiredSkillId_idx" ON "recipe_operation"("requiredSkillId");

ALTER TABLE "recipe_operation"
  ADD CONSTRAINT "recipe_operation_requiredSkillId_fkey"
  FOREIGN KEY ("requiredSkillId") REFERENCES "skill"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Task generation is idempotent per batch and operation position.
CREATE UNIQUE INDEX "production_task_productionBatchId_position_key"
  ON "production_task"("productionBatchId", "position");
