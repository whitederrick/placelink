-- CreateEnum
CREATE TYPE "SupportCaseType" AS ENUM ('INQUIRY', 'COMPLAINT', 'REPORT', 'PRIVACY');

-- CreateEnum
CREATE TYPE "SupportPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SupportCaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportEntryKind" AS ENUM ('CUSTOMER_MESSAGE', 'STAFF_REPLY', 'INTERNAL_NOTE');

-- CreateTable
CREATE TABLE "support_cases" (
    "id" TEXT NOT NULL,
    "reporter_user_id" TEXT,
    "assignee_user_id" TEXT,
    "type" "SupportCaseType" NOT NULL,
    "priority" "SupportPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "SupportCaseStatus" NOT NULL DEFAULT 'OPEN',
    "subject" TEXT NOT NULL,
    "description" VARCHAR(5000) NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "due_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_case_entries" (
    "id" TEXT NOT NULL,
    "support_case_id" TEXT NOT NULL,
    "kind" "SupportEntryKind" NOT NULL,
    "author_id" TEXT NOT NULL,
    "author_type" "ActorType" NOT NULL,
    "body" VARCHAR(5000) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_case_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_cases_status_priority_created_at_id_idx" ON "support_cases"("status", "priority", "created_at", "id");

-- CreateIndex
CREATE INDEX "support_cases_assignee_user_id_status_due_at_idx" ON "support_cases"("assignee_user_id", "status", "due_at");

-- CreateIndex
CREATE INDEX "support_cases_reporter_user_id_created_at_idx" ON "support_cases"("reporter_user_id", "created_at");

-- CreateIndex
CREATE INDEX "support_cases_target_type_target_id_idx" ON "support_cases"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "support_case_entries_support_case_id_created_at_id_idx" ON "support_case_entries"("support_case_id", "created_at", "id");

-- AddForeignKey
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_cases" ADD CONSTRAINT "support_cases_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_case_entries" ADD CONSTRAINT "support_case_entries_support_case_id_fkey" FOREIGN KEY ("support_case_id") REFERENCES "support_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
