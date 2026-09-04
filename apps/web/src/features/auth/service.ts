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
  restoreExpiredSuspensionForUser,
  selectUserByIdentity,
  selectUserForActor,
  updateAuthenticatedUserEmail,
} from "./queries";
import { resolveActorRole, resolveStudioRole } from "./role";

export async function ensureAuthenticatedUser(
  input: AuthenticationProfile,
  now = new Date(),
) {
  const profile = authenticationProfileSchema.parse(input);
  let existing = await selectUserByIdentity(
    profile.provider,
    profile.externalId,
  );
  if (existing) {
    const recovered = await recoverExpiredSuspension(existing.user, now);
    if (recovered) {
      existing = await selectUserByIdentity(
        profile.provider,
        profile.externalId,
      );
      if (!existing) return insertAuthenticatedUser(profile);
    }
    if (profile.email && existing.user.email !== profile.email)
      return updateAuthenticatedUserEmail(existing.user.id, profile.email);
    return existing.user;
  }
  return insertAuthenticatedUser(profile);
}

async function recoverExpiredSuspension(
  user: {
    id: string;
    status: string;
    suspendedUntil: Date | null;
  } | null,
  now: Date,
) {
  if (
    user?.status !== "SUSPENDED" ||
    !user.suspendedUntil ||
    user.suspendedUntil > now
  ) {
    return false;
  }
  return restoreExpiredSuspensionForUser(user.id, now);
}

export async function loadHumanActor(
  userId: string,
  now = new Date(),
): Promise<Actor | null> {
  let user = await selectUserForActor(userId);
  if (await recoverExpiredSuspension(user, now)) {
    user = await selectUserForActor(userId);
  }
  if (!user || user.status !== "ACTIVE") return null;
  return {
    id: user.id,
    type: "HUMAN",
    role: resolveActorRole(
      user.id,
      user.email,
      webEnv.ADMIN_USER_IDS,
      webEnv.STUDIO_OPERATOR_EMAILS,
      user.studioRole,
    ),
    studioRole: resolveStudioRole(
      user.id,
      user.email,
      webEnv.ADMIN_USER_IDS,
      webEnv.STUDIO_OPERATOR_EMAILS,
      user.studioRole,
    ),
  };
}

export async function loadDevelopmentUser(
  userId: DevelopmentUserId,
  now = new Date(),
) {
  const parsedUserId = developmentUserIdSchema.parse(userId);
  let user = await selectUserForActor(parsedUserId);
  if (await recoverExpiredSuspension(user, now)) {
    user = await selectUserForActor(parsedUserId);
  }
  return user;
}
