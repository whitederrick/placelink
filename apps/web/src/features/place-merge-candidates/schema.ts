import { z } from "zod";

export const mergePlaceMergeCandidateSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export type MergePlaceMergeCandidateInput = z.infer<typeof mergePlaceMergeCandidateSchema>;
