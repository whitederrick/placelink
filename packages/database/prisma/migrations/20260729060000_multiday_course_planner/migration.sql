ALTER TABLE "courses"
ADD COLUMN "day_count" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "day_start_minutes" INTEGER NOT NULL DEFAULT 600,
ADD COLUMN "day_end_minutes" INTEGER NOT NULL DEFAULT 1320,
ADD COLUMN "target_stop_count" INTEGER NOT NULL DEFAULT 3;

ALTER TABLE "course_nodes"
ADD COLUMN "day_index" INTEGER NOT NULL DEFAULT 1;

UPDATE "course_nodes"
SET "duration_minutes" = 60
WHERE "duration_minutes" IS NULL;

ALTER TABLE "course_nodes"
ALTER COLUMN "duration_minutes" SET DEFAULT 60;

ALTER TABLE "courses"
ADD CONSTRAINT "courses_day_count_check"
CHECK ("day_count" BETWEEN 1 AND 3),
ADD CONSTRAINT "courses_day_start_minutes_check"
CHECK ("day_start_minutes" BETWEEN 0 AND 1439),
ADD CONSTRAINT "courses_day_end_minutes_check"
CHECK ("day_end_minutes" BETWEEN 1 AND 1440),
ADD CONSTRAINT "courses_day_range_check"
CHECK ("day_end_minutes" - "day_start_minutes" >= 180),
ADD CONSTRAINT "courses_target_stop_count_check"
CHECK ("target_stop_count" BETWEEN 2 AND 24);

ALTER TABLE "course_nodes"
ADD CONSTRAINT "course_nodes_day_index_check"
CHECK ("day_index" BETWEEN 1 AND 3),
ADD CONSTRAINT "course_nodes_duration_minutes_check"
CHECK (
  "duration_minutes" IS NULL
  OR "duration_minutes" BETWEEN 15 AND 480
);

CREATE INDEX "course_nodes_course_id_day_index_order_index_idx"
ON "course_nodes"("course_id", "day_index", "order_index");
