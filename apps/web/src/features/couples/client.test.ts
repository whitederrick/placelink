import { describe, expect, it, vi } from "vitest";
import {
  buildCoupleInviteSignInUrl,
  fetchCoupleInvitePreview,
  submitCoupleInviteAcceptance,
} from "./client";

const token = "a".repeat(43);

describe("couple invite client", () => {
  it("keeps the invite URL as the post-login callback", () => {
    expect(buildCoupleInviteSignInUrl("ko", token)).toBe(
      `/api/auth/signin?callbackUrl=${encodeURIComponent(`/ko/couple/invite/${token}`)}`,
    );
  });

  it("allows retry after an acceptance network failure", async () => {
    const request = vi.fn().mockRejectedValue(new TypeError("network down"));
    await expect(
      submitCoupleInviteAcceptance(token, false, request),
    ).resolves.toBe("rejected");
  });

  it("distinguishes an unauthenticated acceptance", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }));
    await expect(
      submitCoupleInviteAcceptance(token, true, request),
    ).resolves.toBe("unauthorized");
  });

  it("treats a preview network failure as retryable", async () => {
    const request = vi.fn().mockRejectedValue(new TypeError("network down"));
    await expect(fetchCoupleInvitePreview(token, request)).resolves.toEqual({
      kind: "retryable",
    });
  });

  it("treats an expired or used preview as unavailable", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 404 }));
    await expect(fetchCoupleInvitePreview(token, request)).resolves.toEqual({
      kind: "unavailable",
    });
  });
});
