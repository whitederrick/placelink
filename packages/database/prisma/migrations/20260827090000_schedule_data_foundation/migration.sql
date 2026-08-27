-- Expand-only schedule data foundation. Existing Place and Happening rows are unchanged.
ALTER TYPE "ExternalProvider" ADD VALUE IF NOT EXISTS 'CULTURE_PORTAL';
ALTER TYPE "ExternalProvider" ADD VALUE IF NOT EXISTS 'KOPIS';
ALTER TYPE "ExternalProvider" ADD VALUE IF NOT EXISTS 'KOBIS';
ALTER TYPE "ExternalProvider" ADD VALUE IF NOT EXISTS 'OFFICIAL_SITE';

CREATE TYPE "IngestionStatus" AS ENUM ('STAGED', 'NORMALIZED', 'MERGED', 'FAILED');
CREATE TYPE "ScheduleOccurrenceStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'SOLD_OUT');
CREATE TYPE "PlaceKind" AS ENUM ('CAFE', 'RESTAURANT', 'BAR', 'SHOP', 'CINEMA', 'MUSEUM', 'GALLERY', 'PARK', 'ACTIVITY', 'CULTURAL_VENUE', 'OTHER');
CREATE TYPE "VenueOperatorType" AS ENUM ('PUBLIC', 'PRIVATE', 'NONPROFIT', 'UNKNOWN');
CREATE TYPE "HappeningKind" AS ENUM ('EXHIBITION', 'POPUP', 'FESTIVAL', 'PERFORMANCE', 'SCREENING', 'WORKSHOP', 'EVENT', 'OTHER');

ALTER TABLE "happening_translations" ADD COLUMN "schedule_text" TEXT;
ALTER TABLE "places" ADD COLUMN "kind" "PlaceKind",
ADD COLUMN "operator_type" "VenueOperatorType" NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "happenings" ADD COLUMN "kind" "HappeningKind";
ALTER TABLE "courses" ADD COLUMN "source_type" "SourceType";

UPDATE "places"
SET "kind" = CASE "category"
  WHEN 'CAFE' THEN 'CAFE'::"PlaceKind"
  WHEN 'RESTAURANT' THEN 'RESTAURANT'::"PlaceKind"
  WHEN 'BAR' THEN 'BAR'::"PlaceKind"
  WHEN 'SHOP' THEN 'SHOP'::"PlaceKind"
  WHEN 'ACTIVITY' THEN 'ACTIVITY'::"PlaceKind"
  WHEN 'EXHIBITION' THEN 'GALLERY'::"PlaceKind"
  ELSE 'OTHER'::"PlaceKind"
END;

UPDATE "happenings" AS h
SET "kind" = 'EXHIBITION'::"HappeningKind"
FROM "places" AS p
WHERE h."place_id" = p."id" AND p."category" = 'EXHIBITION';

CREATE TABLE "happening_provider_refs" (
    "id" TEXT NOT NULL,
    "happening_id" TEXT NOT NULL,
    "provider" "ExternalProvider" NOT NULL,
    "external_id" TEXT NOT NULL,
    "source_url" TEXT,
    "booking_url" TEXT,
    "last_fetched_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "happening_provider_refs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "schedule_occurrences" (
    "id" TEXT NOT NULL,
    "happening_id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "status" "ScheduleOccurrenceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "booking_url" TEXT,
    CONSTRAINT "schedule_occurrences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "place_opening_periods" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "opens_at_minutes" INTEGER NOT NULL,
    "closes_at_minutes" INTEGER NOT NULL,
    CONSTRAINT "place_opening_periods_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "place_opening_periods_day_check" CHECK ("day_of_week" BETWEEN 0 AND 6),
    CONSTRAINT "place_opening_periods_open_check" CHECK ("opens_at_minutes" BETWEEN 0 AND 1439),
    CONSTRAINT "place_opening_periods_close_check" CHECK ("closes_at_minutes" > "opens_at_minutes" AND "closes_at_minutes" <= 2880)
);

CREATE TABLE "place_opening_exceptions" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "opens_at_minutes" INTEGER,
    "closes_at_minutes" INTEGER,
    "note" TEXT,
    CONSTRAINT "place_opening_exceptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "place_opening_exceptions_hours_check" CHECK (
      ("is_closed" = true AND "opens_at_minutes" IS NULL AND "closes_at_minutes" IS NULL)
      OR
      ("is_closed" = false AND "opens_at_minutes" BETWEEN 0 AND 1439 AND "closes_at_minutes" > "opens_at_minutes" AND "closes_at_minutes" <= 2880)
    )
);

CREATE TABLE "ingestion_records" (
    "id" TEXT NOT NULL,
    "provider" "ExternalProvider" NOT NULL,
    "external_id" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" "IngestionStatus" NOT NULL DEFAULT 'STAGED',
    "source_url" TEXT,
    "raw_payload" JSONB NOT NULL,
    "normalized_payload" JSONB,
    "error_message" TEXT,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ingestion_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "happening_provider_refs_provider_external_id_key" ON "happening_provider_refs"("provider", "external_id");
CREATE INDEX "happening_provider_refs_happening_id_idx" ON "happening_provider_refs"("happening_id");
CREATE INDEX "happening_provider_refs_provider_last_fetched_at_idx" ON "happening_provider_refs"("provider", "last_fetched_at");
CREATE UNIQUE INDEX "schedule_occurrences_happening_id_starts_at_key" ON "schedule_occurrences"("happening_id", "starts_at");
CREATE INDEX "schedule_occurrences_status_starts_at_idx" ON "schedule_occurrences"("status", "starts_at");
CREATE UNIQUE INDEX "place_opening_periods_place_id_day_of_week_opens_at_minutes_key" ON "place_opening_periods"("place_id", "day_of_week", "opens_at_minutes");
CREATE INDEX "place_opening_periods_place_id_day_of_week_idx" ON "place_opening_periods"("place_id", "day_of_week");
CREATE UNIQUE INDEX "place_opening_exceptions_place_id_date_key" ON "place_opening_exceptions"("place_id", "date");
CREATE INDEX "place_opening_exceptions_date_idx" ON "place_opening_exceptions"("date");
CREATE UNIQUE INDEX "ingestion_records_provider_external_id_checksum_key" ON "ingestion_records"("provider", "external_id", "checksum");
CREATE INDEX "ingestion_records_status_fetched_at_idx" ON "ingestion_records"("status", "fetched_at");
CREATE INDEX "ingestion_records_provider_fetched_at_idx" ON "ingestion_records"("provider", "fetched_at");
CREATE INDEX "places_status_kind_area_slug_idx" ON "places"("status", "kind", "area_slug");
CREATE INDEX "places_operator_type_kind_idx" ON "places"("operator_type", "kind");
CREATE INDEX "happenings_kind_status_starts_at_idx" ON "happenings"("kind", "status", "starts_at");
CREATE INDEX "courses_source_type_status_published_at_id_idx" ON "courses"("source_type", "status", "published_at", "id");

ALTER TABLE "happening_provider_refs" ADD CONSTRAINT "happening_provider_refs_happening_id_fkey" FOREIGN KEY ("happening_id") REFERENCES "happenings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedule_occurrences" ADD CONSTRAINT "schedule_occurrences_happening_id_fkey" FOREIGN KEY ("happening_id") REFERENCES "happenings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "place_opening_periods" ADD CONSTRAINT "place_opening_periods_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "place_opening_exceptions" ADD CONSTRAINT "place_opening_exceptions_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
