import { z } from "zod";

export const happeningCurationListQuerySchema = z.object({
  locale: z.enum(["ko", "en"]).default("ko"),
  status: z.enum(["UPCOMING", "ACTIVE", "ENDED"]).optional(),
  anchor: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  take: z.coerce.number().int().min(1).max(100).default(50),
});

export const anchorCurationRequestSchema = z
  .object({ isAnchor: z.boolean() })
  .strict();

export const happeningCurationEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  placeName: z.string().min(1),
  status: z.enum(["UPCOMING", "ACTIVE", "ENDED"]),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isAnchor: z.boolean(),
});

export const happeningCurationListResponseSchema = z.object({
  data: z.array(happeningCurationEntrySchema),
});

export const anchorCurationResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    isAnchor: z.boolean(),
    changed: z.boolean(),
  }),
});

export type HappeningCurationListQuery = z.infer<
  typeof happeningCurationListQuerySchema
>;
export type HappeningCurationListInput = z.input<
  typeof happeningCurationListQuerySchema
>;
export type AnchorCurationRequest = z.infer<typeof anchorCurationRequestSchema>;
export type HappeningCurationEntry = z.infer<
  typeof happeningCurationEntrySchema
>;
