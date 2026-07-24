import { getDatabase } from "@placelink/database";

export function selectCoupleStatus(userId: string) {
  return getDatabase().user.findFirst({
    where: { id: userId, status: "ACTIVE" },
    select: {
      id: true,
      coupleMemberships: {
        where: { leftAt: null, couple: { status: "ACTIVE" } },
        take: 1,
        select: {
          coupleId: true,
          couple: { select: {
            displayName: true,
            startedAt: true,
            members: {
              where: { leftAt: null },
              select: { userId: true, user: { select: { nickname: true } } },
            },
          } },
        },
      },
    },
  });
}

export async function insertCoupleInvite(input: {
  inviterUserId: string; tokenHash: string; startedAt: Date;
  upgradeSoloCourses: boolean; expiresAt: Date; now: Date;
}) {
  return getDatabase().$transaction(async (database) => {
    const inviter = await database.user.findFirst({
      where: { id: input.inviterUserId, status: "ACTIVE" },
      select: { id: true, coupleMemberships: {
        where: { leftAt: null, couple: { status: "ACTIVE" } }, take: 1, select: { id: true },
      } },
    });
    if (!inviter || inviter.coupleMemberships.length > 0) return null;
    await database.coupleInvite.updateMany({
      where: { inviterUserId: input.inviterUserId, acceptedAt: null, revokedAt: null, expiresAt: { gt: input.now } },
      data: { revokedAt: input.now },
    });
    return database.coupleInvite.create({
      data: {
        inviterUserId: input.inviterUserId,
        tokenHash: input.tokenHash,
        startedAt: input.startedAt,
        inviterUpgradeSoloCourses: input.upgradeSoloCourses,
        expiresAt: input.expiresAt,
      },
      select: { expiresAt: true },
    });
  });
}

export function selectInvitePreview(tokenHash: string) {
  return getDatabase().coupleInvite.findUnique({
    where: { tokenHash },
    select: {
      inviterUserId: true, startedAt: true, expiresAt: true, acceptedAt: true, revokedAt: true,
      inviter: { select: { nickname: true, status: true } },
    },
  });
}

export async function acceptInviteTransaction(input: {
  tokenHash: string; accepterUserId: string; accepterUpgradeSoloCourses: boolean; now: Date;
}) {
  return getDatabase().$transaction(async (database) => {
    const invite = await database.coupleInvite.findUnique({
      where: { tokenHash: input.tokenHash },
      select: {
        id: true, inviterUserId: true, startedAt: true, expiresAt: true,
        acceptedAt: true, revokedAt: true, inviterUpgradeSoloCourses: true,
        inviter: { select: { status: true } },
      },
    });
    if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt <= input.now || invite.inviter.status !== "ACTIVE")
      return { kind: "INVALID" as const };
    if (invite.inviterUserId === input.accepterUserId) return { kind: "SELF" as const };
    const users = await database.user.findMany({
      where: { id: { in: [invite.inviterUserId, input.accepterUserId] }, status: "ACTIVE" },
      select: {
        id: true, nickname: true,
        coupleMemberships: { where: { leftAt: null, couple: { status: "ACTIVE" } }, take: 1, select: { id: true } },
      },
    });
    const inviter = users.find((user) => user.id === invite.inviterUserId);
    const accepter = users.find((user) => user.id === input.accepterUserId);
    if (!inviter || !accepter) return { kind: "INVALID" as const };
    if (inviter.coupleMemberships.length || accepter.coupleMemberships.length) return { kind: "CONFLICT" as const };
    const couple = await database.couple.create({
      data: {
        displayName: `${inviter.nickname}❤️${accepter.nickname}`,
        startedAt: invite.startedAt,
        members: { create: [{ userId: inviter.id }, { userId: accepter.id }] },
      },
      select: { id: true, displayName: true, startedAt: true },
    });
    const upgradeUserIds = [
      ...(invite.inviterUpgradeSoloCourses ? [inviter.id] : []),
      ...(input.accepterUpgradeSoloCourses ? [accepter.id] : []),
    ];
    if (upgradeUserIds.length) await database.course.updateMany({
      where: { creatorUserId: { in: upgradeUserIds }, coupleId: null, status: { not: "DELETED" }, deletedAt: null },
      data: { creatorUserId: null, coupleId: couple.id },
    });
    await database.coupleInvite.update({
      where: { id: invite.id }, data: { acceptedAt: input.now, acceptedByUserId: accepter.id },
    });
    await database.coupleInvite.updateMany({
      where: {
        id: { not: invite.id }, inviterUserId: { in: [inviter.id, accepter.id] }, acceptedAt: null, revokedAt: null,
      },
      data: { revokedAt: input.now },
    });
    return { kind: "CONNECTED" as const, couple };
  });
}

export async function dissolveCoupleTransaction(userId: string, now: Date) {
  return getDatabase().$transaction(async (database) => {
    const membership = await database.coupleMember.findFirst({
      where: { userId, leftAt: null, couple: { status: "ACTIVE" } }, select: { coupleId: true },
    });
    if (!membership) return null;
    await database.couple.update({
      where: { id: membership.coupleId }, data: { status: "DISSOLVED", dissolvedAt: now },
    });
    await database.coupleMember.updateMany({
      where: { coupleId: membership.coupleId, leftAt: null }, data: { leftAt: now },
    });
    return { coupleId: membership.coupleId };
  });
}
