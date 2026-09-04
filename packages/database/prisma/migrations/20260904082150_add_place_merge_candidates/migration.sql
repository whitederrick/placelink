-- CreateEnum
CREATE TYPE "PlaceMergeCandidateStatus" AS ENUM ('OPEN', 'DISMISSED', 'MERGED');

-- CreateTable
CREATE TABLE "place_merge_candidates" (
    "id" TEXT NOT NULL,
    "primary_place_id" TEXT NOT NULL,
    "duplicate_place_id" TEXT NOT NULL,
    "candidate_key" TEXT NOT NULL,
    "status" "PlaceMergeCandidateStatus" NOT NULL DEFAULT 'OPEN',
    "reason" VARCHAR(500) NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewer_id" TEXT,

    CONSTRAINT "place_merge_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "place_merge_candidates_candidate_key_key" ON "place_merge_candidates"("candidate_key");

-- CreateIndex
CREATE INDEX "place_merge_candidates_status_detected_at_id_idx" ON "place_merge_candidates"("status", "detected_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "place_merge_candidates_primary_place_id_duplicate_place_id_key" ON "place_merge_candidates"("primary_place_id", "duplicate_place_id");

-- AddForeignKey
ALTER TABLE "place_merge_candidates" ADD CONSTRAINT "place_merge_candidates_primary_place_id_fkey" FOREIGN KEY ("primary_place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_merge_candidates" ADD CONSTRAINT "place_merge_candidates_duplicate_place_id_fkey" FOREIGN KEY ("duplicate_place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
