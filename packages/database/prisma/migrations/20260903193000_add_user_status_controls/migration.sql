ALTER TABLE "users"
  ADD COLUMN "status_reason" VARCHAR(500),
  ADD COLUMN "suspended_until" TIMESTAMP(3),
  ADD COLUMN "status_changed_at" TIMESTAMP(3);

CREATE INDEX "users_status_suspended_until_idx"
  ON "users"("status", "suspended_until");
