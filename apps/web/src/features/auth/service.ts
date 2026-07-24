import type { Actor } from "../../lib/auth/actor";
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
} from "./queries";

export async function ensureAuthenticatedUser(input: AuthenticationProfile) {
  const profile = authenticationProfileSchema.parse(input);
  const existing = await selectUserByIdentity(
    profile.provider,
    profile.externalId,
  );
  if (existing) return existing.user;
  return insertAuthenticatedUser(profile);
}

export async function loadHumanActor(userId: string): Promise<Actor | null> {
  const user = await selectUserForActor(userId);
  if (!user || user.status !== "ACTIVE") return null;
  return { id: user.id, type: "HUMAN", role: "USER" };
}

export async function loadDevelopmentUser(userId: DevelopmentUserId) {
  return selectUserForActor(developmentUserIdSchema.parse(userId));
}
