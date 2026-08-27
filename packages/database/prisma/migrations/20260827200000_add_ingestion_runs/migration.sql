-- CreateEnum
CREATE TYPE "IngestionRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "IngestionTrigger" AS ENUM ('MANUAL', 'SCHEDULED');

-- CreateTable
CREATE TABLE "ingestion_runs" (
    "id" TEXT NOT NULL,
    "provider" "ExternalProvider" NOT NULL,
    "status" "IngestionRunStatus" NOT NULL DEFAULT 'RUNNING',
    "trigger" "IngestionTrigger" NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_type" "ActorType" NOT NULL,
    "request_payload" JSONB NOT NULL,
    "total_available" INTEGER,
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "selected" INTEGER NOT NULL DEFAULT 0,
    "inserted" INTEGER NOT NULL DEFAULT 0,
    "unchanged" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingestion_runs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ingestion_records" ADD COLUMN "ingestion_run_id" TEXT;

-- CreateIndex
CREATE INDEX "ingestion_runs_status_started_at_id_idx" ON "ingestion_runs"("status", "started_at", "id");

-- CreateIndex
CREATE INDEX "ingestion_runs_provider_started_at_id_idx" ON "ingestion_runs"("provider", "started_at", "id");

-- CreateIndex
CREATE INDEX "ingestion_records_ingestion_run_id_created_at_idx" ON "ingestion_records"("ingestion_run_id", "created_at");

-- AddForeignKey
ALTER TABLE "ingestion_records" ADD CONSTRAINT "ingestion_records_ingestion_run_id_fkey" FOREIGN KEY ("ingestion_run_id") REFERENCES "ingestion_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
