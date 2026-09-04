import type { Actor } from "./actor";
import { AppError, ErrorCode } from "../errors";

export const STUDIO_PERMISSIONS = [
  "studio.dashboard.read",
  "studio.users.read",
  "studio.users.manage",
  "studio.users.withdraw",
  "studio.support.read",
  "studio.support.manage",
  "studio.content.read",
  "studio.content.manage",
  "studio.ingestions.read",
  "studio.ingestions.manage",
  "studio.analytics.read",
  "studio.audit.read",
  "studio.roles.manage",
] as const;

export type StudioPermission = (typeof STUDIO_PERMISSIONS)[number];
type StudioRole = NonNullable<Actor["studioRole"]>;

const rolePermissions: Record<StudioRole, readonly StudioPermission[]> = {
  SUPER_ADMIN: STUDIO_PERMISSIONS,
  SUPPORT: [
    "studio.dashboard.read",
    "studio.users.read",
    "studio.users.manage",
    "studio.support.read",
    "studio.support.manage",
    "studio.audit.read",
  ],
  CONTENT: [
    "studio.dashboard.read",
    "studio.content.read",
    "studio.content.manage",
    "studio.ingestions.read",
    "studio.ingestions.manage",
    "studio.analytics.read",
    "studio.audit.read",
  ],
  ANALYST: [
    "studio.dashboard.read",
    "studio.users.read",
    "studio.content.read",
    "studio.ingestions.read",
    "studio.analytics.read",
    "studio.audit.read",
  ],
};

export function hasStudioPermission(
  actor: Actor | null | undefined,
  permission: StudioPermission,
) {
  if (actor?.role !== "ADMIN") return false;
  const studioRole = actor.studioRole ?? "SUPER_ADMIN";
  return rolePermissions[studioRole].includes(permission);
}

export function requireStudioPermission(
  actor: Actor,
  permission: StudioPermission,
) {
  if (!hasStudioPermission(actor, permission))
    throw new AppError(ErrorCode.FORBIDDEN, "Studio permission required", 403);
}
