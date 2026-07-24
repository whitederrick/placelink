import { createHash, randomBytes } from "node:crypto";
import type { Actor } from "../../lib/auth/actor";
import { AppError, ErrorCode } from "../../lib/errors";
import { acceptInviteTransaction, dissolveCoupleTransaction, insertCoupleInvite, selectCoupleStatus, selectInvitePreview } from "./queries";
import type { AcceptCoupleInviteRequest, CreateCoupleInviteRequest } from "./schema";

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1_000;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function loadCoupleStatus(actor: Actor) {
  const user = await selectCoupleStatus(actor.id);
  if (!user) throw new AppError(ErrorCode.USER_NOT_FOUND, "Active user not found", 404);
  const membership = user.coupleMemberships[0];
  const partner = membership?.couple.members.find((member) => member.userId !== actor.id);
  return { data: {
    connected: Boolean(membership),
    couple: membership ? {
      displayName: membership.couple.displayName,
      startedAt: membership.couple.startedAt.toISOString(),
      partnerNickname: partner?.user.nickname ?? "",
    } : null,
  } };
}

export async function createCoupleInvite(actor: Actor, input: CreateCoupleInviteRequest, origin: string, locale: string, now = new Date()) {
  const startedAt = new Date(`${input.startedAt}T00:00:00.000Z`);
  if (startedAt > now)
    throw new AppError(ErrorCode.INVALID_INPUT, "The couple start date cannot be in the future", 400);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + INVITE_LIFETIME_MS);
  const invite = await insertCoupleInvite({
    inviterUserId: actor.id,
    tokenHash: hashToken(token),
    startedAt,
    upgradeSoloCourses: input.upgradeSoloCourses,
    expiresAt,
    now,
  });
  if (!invite) throw new AppError(ErrorCode.COUPLE_CONFLICT, "User already belongs to a couple", 409);
  return { data: { inviteUrl: `${origin}/${locale}/couple/invite/${token}`, expiresAt: invite.expiresAt.toISOString() } };
}

export async function loadCoupleInvite(token: string, now = new Date()) {
  const invite = await selectInvitePreview(hashToken(token));
  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt <= now || invite.inviter.status !== "ACTIVE")
    throw new AppError(ErrorCode.COUPLE_INVITE_NOT_FOUND, "Invite is unavailable", 404);
  return { data: {
    inviterNickname: invite.inviter.nickname,
    startedAt: invite.startedAt.toISOString(),
    expiresAt: invite.expiresAt.toISOString(),
  } };
}

export async function acceptCoupleInvite(actor: Actor, token: string, input: AcceptCoupleInviteRequest, now = new Date()) {
  let result: Awaited<ReturnType<typeof acceptInviteTransaction>>;
  try {
    result = await acceptInviteTransaction({
      tokenHash: hashToken(token), accepterUserId: actor.id,
      accepterUpgradeSoloCourses: input.upgradeSoloCourses, now,
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
      throw new AppError(ErrorCode.COUPLE_CONFLICT, "One user already belongs to a couple", 409);
    throw error;
  }
  if (result.kind === "INVALID") throw new AppError(ErrorCode.COUPLE_INVITE_NOT_FOUND, "Invite is unavailable", 404);
  if (result.kind === "SELF") throw new AppError(ErrorCode.INVALID_INPUT, "You cannot accept your own invite", 400);
  if (result.kind === "CONFLICT") throw new AppError(ErrorCode.COUPLE_CONFLICT, "One user already belongs to a couple", 409);
  return { data: { connected: true, couple: result.couple } };
}

export async function dissolveCouple(actor: Actor, now = new Date()) {
  const result = await dissolveCoupleTransaction(actor.id, now);
  if (!result) throw new AppError(ErrorCode.COUPLE_CONFLICT, "No active couple connection", 409);
  return { data: { connected: false } };
}
