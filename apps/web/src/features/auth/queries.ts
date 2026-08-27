import { getDatabase } from "@placelink/database";
import type { AuthenticationProfile } from "./schema";

export async function selectUserByIdentity(
  provider: AuthenticationProfile["provider"],
  externalId: string,
) {
  return getDatabase().authIdentity.findUnique({
    where: { provider_externalId: { provider, externalId } },
    select: {
      user: { select: { id: true, email: true, nickname: true, status: true } },
    },
  });
}

export async function updateAuthenticatedUserEmail(
  userId: string,
  email: string,
) {
  return getDatabase().user.update({
    where: { id: userId },
    data: { email },
    select: { id: true, email: true, nickname: true, status: true },
  });
}

export async function insertAuthenticatedUser(profile: AuthenticationProfile) {
  return getDatabase().user.create({
    data: {
      nickname: profile.nickname,
      email: profile.email,
      authIdentities: {
        create: { provider: profile.provider, externalId: profile.externalId },
      },
    },
    select: { id: true, email: true, nickname: true, status: true },
  });
}

export async function selectUserForActor(userId: string) {
  return getDatabase().user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, nickname: true, status: true },
  });
}
