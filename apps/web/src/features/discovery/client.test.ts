import { describe, expect, it, vi } from "vitest";
import { fetchHomeFeedPage } from "./client";

const emptyFeed = {
  happenings: [],
  courses: [],
  hallOfFame: [],
  filters: { situations: [], budgets: [], moods: [] },
};

describe("fetchHomeFeedPage", () => {
  it("preserves the active filters and cursor in the next-page request", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: emptyFeed,
          meta: { nextCursor: "course-40" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await fetchHomeFeedPage(
      {
        locale: "ko",
        take: 20,
        sort: "popular",
        ranking: "weekly",
        area: "seongsu",
        mood: "cozy",
        cursor: "course-20",
      },
      request,
    );

    expect(request).toHaveBeenCalledWith(
      "/api/v1/discovery/feed?locale=ko&take=20&sort=popular&ranking=weekly&area=seongsu&mood=cozy&cursor=course-20",
    );
    expect(result.meta.nextCursor).toBe("course-40");
  });

  it("rejects unsuccessful responses", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 500 }));

    await expect(
      fetchHomeFeedPage(
        { locale: "en", take: 20, sort: "latest", ranking: "weekly" },
        request,
      ),
    ).rejects.toThrow("Home feed request failed");
  });
});
