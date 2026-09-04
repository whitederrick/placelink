CREATE TYPE "StudioRole" AS ENUM ('SUPER_ADMIN', 'SUPPORT', 'CONTENT', 'ANALYST');

ALTER TABLE "users" ADD COLUMN "studio_role" "StudioRole";

CREATE INDEX "users_studio_role_idx" ON "users"("studio_role");
