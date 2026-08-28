import type { Actor } from "../../lib/auth/actor";

export function resolveActorRole(
  userId: string,
  email: string | null,
  adminUserIds: readonly string[],
  operatorEmails: readonly string[],
): Actor["role"] {
  return adminUserIds.includes(userId) ||
    isStudioOperatorEmail(email, operatorEmails)
    ? "ADMIN"
    : "USER";
}

export function isStudioOperatorEmail(
  email: string | null | undefined,
  operatorEmails: readonly string[],
) {
  return Boolean(email && operatorEmails.includes(email.trim().toLowerCase()));
}
