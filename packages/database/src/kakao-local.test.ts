import { describe, expect, it, vi } from "vitest";
import { searchKakaoPlaces } from "./kakao-local";

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
});
