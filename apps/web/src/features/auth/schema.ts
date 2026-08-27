import { z } from "zod";

export const authenticationProviderSchema = z.enum(["KAKAO", "GOOGLE"]);
export const developmentUserIdSchema = z.enum([
  "seed-user-jihoon",
  "seed-user-minji",
]);
export const authenticationProfileSchema = z.object({
  provider: authenticationProviderSchema,
  externalId: z.string().min(1).max(255),
  nickname: z.string().trim().min(1).max(50),
  email: z.string().trim().toLowerCase().email().nullable(),
});

export type AuthenticationProfile = z.infer<typeof authenticationProfileSchema>;
export type DevelopmentUserId = z.infer<typeof developmentUserIdSchema>;
