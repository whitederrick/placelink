-- Expand phase: the new filter key remains nullable until all production rows are backfilled.
ALTER TABLE "places" ADD COLUMN "area_slug" TEXT;

CREATE INDEX "places_status_area_slug_category_id_idx"
ON "places"("status", "area_slug", "category", "id");
