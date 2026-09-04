import { z } from "zod";

export const contentTargetTypeSchema = z.enum(["PLACE", "HAPPENING", "COURSE"]);
export const contentModerationRequestSchema = z.object({
  action: z.enum(["HIDE", "RESTORE"]),
  reason: z.string().trim().min(3).max(500),
}).strict();

export type ContentTargetType = z.infer<typeof contentTargetTypeSchema>;
export type ContentModerationRequest = z.infer<typeof contentModerationRequestSchema>;
