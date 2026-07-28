import { describe, expect, it, vi } from "vitest";
import {
  searchKakaoPlaces,
  selectKakaoPlaces,
  type KakaoPlaceDocument,
} from "./kakao-local";

function place(
  name: string,
  category: string,
  group: string,
): KakaoPlaceDocument {
  return {
    id: name,
    place_name: name,
    category_name: category,
    category_group_code: group,
    category_group_name: "",
    phone: "",
    address_name: "서울 성동구 성수동",
    road_address_name: "",
    x: "127.0559",
    y: "37.5446",
    place_url: `https://place.map.kakao.com/${encodeURIComponent(name)}`,
    distance: "100",
  };
}

describe("searchKakaoPlaces", () => {
  it("sends a server-key request and validates place documents", async () => {
    let requestedUrl = "";
    let requestedInit: RequestInit | undefined;
    const fetcher: typeof fetch = vi.fn(async (input, init) => {
      requestedUrl = String(input);
      requestedInit = init;

      return new Response(
        JSON.stringify({
          meta: { total_count: 1, pageable_count: 1, is_end: true },
          documents: [
            {
              id: "123",
              place_name: "테스트 카페",
              category_name: "음식점 > 카페",
              category_group_code: "CE7",
              category_group_name: "카페",
              phone: "02-000-0000",
              address_name: "서울 성동구 성수동",
              road_address_name: "서울 성동구 연무장길",
              x: "127.0559",
              y: "37.5446",
              place_url: "https://place.map.kakao.com/123",
              distance: "120",
            },
          ],
        }),
        { status: 200 },
      );
    });

    const places = await searchKakaoPlaces({
      restApiKey: "server-key",
      query: "성수 카페",
      center: { lat: 37.5446, lng: 127.0559 },
      fetcher,
    });

    expect(places[0]).toMatchObject({
      id: "123",
      place_name: "테스트 카페",
    });
    expect(requestedUrl).toContain(
      "query=%EC%84%B1%EC%88%98+%EC%B9%B4%ED%8E%98",
    );
    expect(requestedInit?.headers).toEqual({
      Authorization: "KakaoAK server-key",
    });
  });

  it("reports provider failures without exposing the server key", async () => {
    const fetcher: typeof fetch = vi.fn(async () =>
      Promise.resolve(
        new Response('{"msg":"quota exceeded"}', { status: 429 }),
      ),
    );

    await expect(
      searchKakaoPlaces({
        restApiKey: "never-print-this-key",
        query: "연남 카페",
        center: { lat: 37.5627, lng: 126.9258 },
        fetcher,
      }),
    ).rejects.not.toThrow("never-print-this-key");
  });

  it("selects category matches while excluding chains and mismatches", () => {
    const candidates = [
      place("스타벅스 성수점", "음식점 > 카페 > 스타벅스", "CE7"),
      place("로컬 티룸", "음식점 > 카페", "CE7"),
      place("데이트 와인바", "음식점 > 술집 > 와인바", "FD6"),
      place("로컬 디저트", "음식점 > 카페", "CE7"),
    ];

    expect(
      selectKakaoPlaces(
        candidates,
        {
          allowedGroupCodes: ["CE7"],
          nameOrCategoryExcludesAny: ["스타벅스"],
        },
        2,
      ).map((candidate) => candidate.place_name),
    ).toEqual(["로컬 티룸", "로컬 디저트"]);
  });

  it("can distinguish restaurants from bars within the food group", () => {
    const candidates = [
      place("레스토랑", "음식점 > 양식", "FD6"),
      place("와인바", "음식점 > 술집 > 와인바", "FD6"),
    ];

    expect(
      selectKakaoPlaces(
        candidates,
        { allowedGroupCodes: ["FD6"], categoryExcludesAny: ["술집"] },
        3,
      ).map((candidate) => candidate.place_name),
    ).toEqual(["레스토랑"]);
    expect(
      selectKakaoPlaces(
        candidates,
        { allowedGroupCodes: ["FD6"], categoryIncludesAny: ["술집"] },
        3,
      ).map((candidate) => candidate.place_name),
    ).toEqual(["와인바"]);
  });
});
