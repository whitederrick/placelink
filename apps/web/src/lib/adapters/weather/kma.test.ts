import { describe, expect, it, vi } from "vitest";
import { createKmaWeatherProvider, getKmaObservationBaseTime } from "./kma";

describe("getKmaObservationBaseTime", () => {
  it("uses a safely published Seoul observation hour", () => {
    expect(
      getKmaObservationBaseTime(new Date("2026-08-26T01:35:00.000Z")),
    ).toEqual({ baseDate: "20260826", baseTime: "0900" });
    expect(
      getKmaObservationBaseTime(new Date("2026-08-25T15:20:00.000Z")),
    ).toEqual({ baseDate: "20260825", baseTime: "2300" });
  });
});

describe("createKmaWeatherProvider", () => {
  it("maps temperature and precipitation without inventing a sky condition", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          response: {
            header: { resultCode: "00", resultMsg: "NORMAL_SERVICE" },
            body: {
              items: {
                item: [
                  { category: "T1H", obsrValue: "24.6" },
                  { category: "PTY", obsrValue: "1" },
                ],
              },
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const provider = createKmaWeatherProvider("encoded-service-key", request);

    await expect(
      provider.getCurrentSeoulWeather(new Date("2026-08-26T01:50:00.000Z")),
    ).resolves.toEqual({ temperatureC: 24.6, precipitation: "rain" });
    expect(request).toHaveBeenCalledOnce();
    const requestedUrl = new URL(request.mock.calls[0]![0] as string);
    expect(requestedUrl.searchParams.get("nx")).toBe("60");
    expect(requestedUrl.searchParams.get("ny")).toBe("127");
    expect(requestedUrl.searchParams.get("base_date")).toBe("20260826");
    expect(requestedUrl.searchParams.get("base_time")).toBe("1000");
  });

  it("rejects incomplete observations so the home service can fall back", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          response: {
            header: { resultCode: "00", resultMsg: "NORMAL_SERVICE" },
            body: {
              items: { item: [{ category: "PTY", obsrValue: "0" }] },
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    await expect(
      createKmaWeatherProvider("key", request).getCurrentSeoulWeather(
        new Date("2026-08-26T01:50:00.000Z"),
      ),
    ).rejects.toThrow("KMA observation is incomplete");
  });
});
