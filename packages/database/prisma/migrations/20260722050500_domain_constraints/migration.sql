-- Prisma cannot express partial indexes, PostGIS indexes, or cross-column checks.
CREATE UNIQUE INDEX "couple_members_one_active_per_user_idx"
ON "couple_members" ("user_id")
WHERE "left_at" IS NULL;

ALTER TABLE "couples"
ADD CONSTRAINT "couples_dissolution_state_check"
CHECK (
  ("status" = 'ACTIVE' AND "dissolved_at" IS NULL)
  OR ("status" = 'DISSOLVED' AND "dissolved_at" IS NOT NULL)
);

ALTER TABLE "happenings"
ADD CONSTRAINT "happenings_valid_period_check"
CHECK ("starts_at" < "ends_at");

ALTER TABLE "courses"
ADD CONSTRAINT "courses_exactly_one_owner_check"
CHECK (num_nonnulls("creator_user_id", "couple_id") = 1),
ADD CONSTRAINT "courses_nonnegative_counters_check"
CHECK ("view_count" >= 0 AND "scrap_count" >= 0),
ADD CONSTRAINT "courses_positive_duration_check"
CHECK ("duration_minutes" IS NULL OR "duration_minutes" > 0);

ALTER TABLE "course_nodes"
ADD CONSTRAINT "course_nodes_nonnegative_order_check"
CHECK ("order_index" >= 0),
ADD CONSTRAINT "course_nodes_positive_values_check"
CHECK (
  ("duration_minutes" IS NULL OR "duration_minutes" > 0)
  AND ("distance_meters" IS NULL OR "distance_meters" >= 0)
);

ALTER TABLE "places"
ADD CONSTRAINT "places_coordinate_range_check"
CHECK ("lat" BETWEEN -90 AND 90 AND "lng" BETWEEN -180 AND 180);

CREATE FUNCTION sync_place_location() RETURNS trigger AS $$
BEGIN
  NEW."location" = ST_SetSRID(
    ST_MakePoint(NEW."lng"::double precision, NEW."lat"::double precision),
    4326
  )::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "places_sync_location_trigger"
BEFORE INSERT OR UPDATE OF "lat", "lng" ON "places"
FOR EACH ROW EXECUTE FUNCTION sync_place_location();

UPDATE "places"
SET "location" = ST_SetSRID(
  ST_MakePoint("lng"::double precision, "lat"::double precision),
  4326
)::geography
WHERE "location" IS NULL;

ALTER TABLE "places" ALTER COLUMN "location" SET NOT NULL;

CREATE INDEX "places_location_gist_idx"
ON "places" USING GIST ("location");
