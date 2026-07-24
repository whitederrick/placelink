import { coupleInvitePreviewResponseSchema } from "./schema";

type Request = typeof fetch;

export type CoupleInvitePreviewResult =
  | {
      kind: "ready";
      data: { inviterNickname: string; startedAt: string };
    }
  | { kind: "unavailable" }
  | { kind: "retryable" };

export async function fetchCoupleInvitePreview(
  token: string,
  request: Request = fetch,
): Promise<CoupleInvitePreviewResult> {
  try {
    const response = await request(
      `/api/v1/couples/invites/${encodeURIComponent(token)}`,
    );
    if (response.status === 400 || response.status === 404)
      return { kind: "unavailable" };
    if (!response.ok) return { kind: "retryable" };
    const parsed = coupleInvitePreviewResponseSchema.parse(
      await response.json(),
    );
    return {
      kind: "ready",
      data: {
        inviterNickname: parsed.data.inviterNickname,
        startedAt: parsed.data.startedAt,
      },
    };
  } catch {
    return { kind: "retryable" };
  }
}

export type AcceptCoupleInviteResult = "accepted" | "unauthorized" | "rejected";

export async function submitCoupleInviteAcceptance(
  token: string,
  upgradeSoloCourses: boolean,
  request: Request = fetch,
): Promise<AcceptCoupleInviteResult> {
  try {
    const response = await request(
      `/api/v1/couples/invites/${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ upgradeSoloCourses }),
      },
    );
    if (response.status === 401) return "unauthorized";
    return response.ok ? "accepted" : "rejected";
  } catch {
    return "rejected";
  }
}

export function buildCoupleInviteSignInUrl(locale: "ko" | "en", token: string) {
  const callbackUrl = `/${locale}/couple/invite/${token}`;
  return `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}
