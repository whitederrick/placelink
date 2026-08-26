import { describe, expect, it } from "vitest";
import { findTrackedHomeFilter } from "./tracking";

describe("findTrackedHomeFilter", () => {
  it("ignores locale, page size, and latest sort defaults", () => {
    expect(
      findTrackedHomeFilter({
        locale: "ko",
        take: 2,
        sort: "latest",
        ranking: "weekly",
      }),
    ).toBeUndefined();
  });

  it("selects only a supported active home filter", () => {
    expect(
      findTrackedHomeFilter({
        locale: "en",
        take: 20,
        sort: "popular",
        ranking: "monthly",
        mood: "cozy",
      }),
    ).toEqual(["sort", "popular"]);
  });

  it("tracks an explicit monthly hall-of-fame view", () => {
    expect(
      findTrackedHomeFilter({
        locale: "ko",
        take: 20,
        sort: "latest",
        ranking: "monthly",
      }),
    ).toEqual(["ranking", "monthly"]);
  });
});
