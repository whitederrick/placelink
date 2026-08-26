import { describe, expect, it } from "vitest";
import { createPlaceMapUrl } from "./deep-links";

const place = {
  name: "성수 아카이브",
  lat: 37.5445,
  lng: 127.056,
};

describe("createPlaceMapUrl", () => {
  it("opens Kakao Map with the localized place for Korean users", () => {
    expect(createPlaceMapUrl("ko", place)).toBe(
      "https://map.kakao.com/link/map/%EC%84%B1%EC%88%98%20%EC%95%84%EC%B9%B4%EC%9D%B4%EB%B8%8C,37.5445,127.056",
    );
  });

  it("opens the coordinate in Google Maps for English users", () => {
    const url = new URL(createPlaceMapUrl("en", place));
    expect(url.origin + url.pathname).toBe(
      "https://www.google.com/maps/search/",
    );
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("query")).toBe("37.5445,127.056");
  });
});
