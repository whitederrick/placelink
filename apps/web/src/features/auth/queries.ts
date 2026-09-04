import { getDatabase } from "@placelink/database";
import type { AuthenticationProfile } from "./schema";

export async function selectUserByIdentity(
  provider: AuthenticationProfile["provider"],
  externalId: string,
) {
  return getDatabase().authIdentity.findUnique({
    where: { provider_externalId: { provider, externalId } },
    select: {
      user: {
        select: {
          id: true,
          email: true,
          nickname: true,
          status: true,
          suspendedUntil: true,
        },
      },
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
    select: {
      id: true,
      email: true,
      nickname: true,
      status: true,
      suspendedUntil: true,
      studioRole: true,
    },
  });
}

export function restoreExpiredSuspensionForUser(userId: string, now: Date) {
  return getDatabase().$transaction(async (transaction) => {
    const before = await transaction.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        statusReason: true,
        suspendedUntil: true,
        deletedAt: true,
      },
    });
    if (
      before?.status !== "SUSPENDED" ||
      !before.suspendedUntil ||
      before.suspendedUntil > now
    ) {
      return false;
    }
    const restored = await transaction.user.updateManyAndReturn({
      where: {
        id: userId,
        status: "SUSPENDED",
        suspendedUntil: { not: null, lte: now },
      },
      data: {
        status: "ACTIVE",
        statusReason: "Timed suspension expired automatically",
        suspendedUntil: null,
        statusChangedAt: now,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (restored.length === 0) return false;
    await transaction.auditLog.create({
      data: {
        actorId: "user-suspension-expiry-on-access",
        actorType: "AGENT",
        action: "user.status.auto_restored",
        targetType: "User",
        targetId: userId,
        before: {
          status: before.status,
          statusReason: before.statusReason,
          suspendedUntil: before.suspendedUntil.toISOString(),
          deletedAt: before.deletedAt?.toISOString() ?? null,
        },
        after: {
          status: "ACTIVE",
          reason: "Timed suspension expired automatically",
          suspendedUntil: null,
          deletedAt: null,
          restoredAt: now.toISOString(),
        },
      },
    });
    return true;
  });
}
