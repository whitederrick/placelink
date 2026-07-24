CREATE TABLE "couple_invites" (
  "id" TEXT NOT NULL,
  "inviter_user_id" TEXT NOT NULL,
  "accepted_by_user_id" TEXT,
  "token_hash" CHAR(64) NOT NULL,
  "started_at" DATE NOT NULL,
  "inviter_upgrade_solo_courses" BOOLEAN NOT NULL DEFAULT false,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "accepted_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "couple_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "couple_invites_token_hash_key" ON "couple_invites"("token_hash");
CREATE INDEX "couple_invites_inviter_user_id_created_at_idx" ON "couple_invites"("inviter_user_id", "created_at");
CREATE INDEX "couple_invites_expires_at_idx" ON "couple_invites"("expires_at");

ALTER TABLE "couple_invites" ADD CONSTRAINT "couple_invites_inviter_user_id_fkey"
  FOREIGN KEY ("inviter_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "couple_invites" ADD CONSTRAINT "couple_invites_accepted_by_user_id_fkey"
  FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "couple_invites" ADD CONSTRAINT "couple_invites_terminal_state_check" CHECK (
  NOT ("accepted_at" IS NOT NULL AND "revoked_at" IS NOT NULL)
);
