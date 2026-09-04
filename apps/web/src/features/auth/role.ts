import type { Actor } from "../../lib/auth/actor";

export function resolveActorRole(
  userId: string,
  email: string | null,
  adminUserIds: readonly string[],
  operatorEmails: readonly string[],
  studioRole?: Actor["studioRole"] | null,
): Actor["role"] {
  return studioRole ||
    adminUserIds.includes(userId) ||
    isStudioOperatorEmail(email, operatorEmails)
    ? "ADMIN"
    : "USER";
}

export function resolveStudioRole(
  userId: string,
  email: string | null,
  adminUserIds: readonly string[],
  operatorEmails: readonly string[],
  studioRole?: Actor["studioRole"] | null,
): Actor["studioRole"] | undefined {
  if (studioRole) return studioRole;
  return adminUserIds.includes(userId) ||
    isStudioOperatorEmail(email, operatorEmails)
    ? "SUPER_ADMIN"
    : undefined;
}

export function isStudioOperatorEmail(
  email: string | null | undefined,
  operatorEmails: readonly string[],
) {
  return Boolean(email && operatorEmails.includes(email.trim().toLowerCase()));
}
