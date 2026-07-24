import { z } from "zod";

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)),
);

export const createCoupleInviteRequestSchema = z.object({
  startedAt: dateOnlySchema,
  upgradeSoloCourses: z.boolean().default(false),
});
export const acceptCoupleInviteRequestSchema = z.object({ upgradeSoloCourses: z.boolean().default(false) });
export const coupleInviteTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,128}$/);
export const coupleStatusResponseSchema = z.object({ data: z.object({
  connected: z.boolean(),
  couple: z.object({ displayName: z.string(), startedAt: z.string().datetime(), partnerNickname: z.string() }).nullable(),
}) });
export const coupleInvitePreviewResponseSchema = z.object({ data: z.object({
  inviterNickname: z.string(), startedAt: z.string().datetime(), expiresAt: z.string().datetime(),
}) });
export const createCoupleInviteResponseSchema = z.object({ data: z.object({
  inviteUrl: z.string().url(), expiresAt: z.string().datetime(),
}) });
export type CreateCoupleInviteRequest = z.infer<typeof createCoupleInviteRequestSchema>;
export type AcceptCoupleInviteRequest = z.infer<typeof acceptCoupleInviteRequestSchema>;
