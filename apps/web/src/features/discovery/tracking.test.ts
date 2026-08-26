import { describe, expect, it } from "vitest";
import { findTrackedHomeFilter } from "./tracking";

describe("findTrackedHomeFilter", () => {
  it("ignores locale, page size, and latest sort defaults", () => {
    expect(
      findTrackedHomeFilter({ locale: "ko", take: 2, sort: "latest" }),
    ).toBeUndefined();
  });

  it("selects only a supported active home filter", () => {
    expect(
      findTrackedHomeFilter({
        locale: "en",
        take: 20,
        sort: "popular",
        mood: "cozy",
      }),
    ).toEqual(["sort", "popular"]);
  });
});
