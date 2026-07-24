import { describe, expect, it } from "vitest";
import { getSiteOrigin } from "./site-url";

describe("getSiteOrigin", () => {
  it("prefers the explicit public site URL and removes trailing slashes", () => {
    expect(
      getSiteOrigin({
        NEXT_PUBLIC_SITE_URL: "https://place.example.com///",
        VERCEL_PROJECT_PRODUCTION_URL: "placelink.vercel.app",
      }),
    ).toBe("https://place.example.com");
  });

  it("uses the stable Vercel production host before a preview host", () => {
    expect(
      getSiteOrigin({
        VERCEL_PROJECT_PRODUCTION_URL: "placelink.vercel.app",
        VERCEL_URL: "placelink-git-feature.vercel.app",
      }),
    ).toBe("https://placelink.vercel.app");
  });

  it("falls back to local development", () => {
    expect(getSiteOrigin({})).toBe("http://localhost:3000");
  });
});
