import type { Actor } from "../../lib/auth/actor";
import { webEnv } from "../../lib/env";
import {
  authenticationProfileSchema,
  developmentUserIdSchema,
  type AuthenticationProfile,
  type DevelopmentUserId,
} from "./schema";
import {
  insertAuthenticatedUser,
  selectUserByIdentity,
  selectUserForActor,
  updateAuthenticatedUserEmail,
} from "./queries";
import { resolveActorRole } from "./role";

export async function ensureAuthenticatedUser(input: AuthenticationProfile) {
  const profile = authenticationProfileSchema.parse(input);
  const existing = await selectUserByIdentity(
    profile.provider,
    profile.externalId,
  );
  if (existing) {
    if (profile.email && existing.user.email !== profile.email)
      return updateAuthenticatedUserEmail(existing.user.id, profile.email);
    return existing.user;
  }
  return insertAuthenticatedUser(profile);
}

export async function loadHumanActor(userId: string): Promise<Actor | null> {
  const user = await selectUserForActor(userId);
  if (!user || user.status !== "ACTIVE") return null;
  return {
    id: user.id,
    type: "HUMAN",
    role: resolveActorRole(
      user.id,
      user.email,
      webEnv.ADMIN_USER_IDS,
      webEnv.STUDIO_OPERATOR_EMAILS,
    ),
  };
}

export async function loadDevelopmentUser(userId: DevelopmentUserId) {
  return selectUserForActor(developmentUserIdSchema.parse(userId));
}
