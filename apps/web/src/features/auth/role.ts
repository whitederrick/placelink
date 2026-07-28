import type { Actor } from "../../lib/auth/actor";

export function resolveActorRole(
  userId: string,
  adminUserIds: readonly string[],
): Actor["role"] {
  return adminUserIds.includes(userId) ? "ADMIN" : "USER";
}
