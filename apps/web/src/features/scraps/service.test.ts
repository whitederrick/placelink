import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMocks = vi.hoisted(() => ({
  selectScrappableCourse: vi.fn(),
  selectCourseScrap: vi.fn(),
  countRecentUserScraps: vi.fn(),
  setCourseScrap: vi.fn(),
}));

vi.mock("./queries", () => queryMocks);

import { addCourseScrap, removeCourseScrap } from "./service";

const actor = { id: "user-1", type: "HUMAN" as const, role: "USER" as const };

describe("course scraps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryMocks.selectScrappableCourse.mockResolvedValue({ id: "course-1", scrapCount: 4 });
    queryMocks.countRecentUserScraps.mockResolvedValue(0);
  });

  it("adds a scrap and returns the source-derived count", async () => {
    queryMocks.selectCourseScrap.mockResolvedValue(null);
    queryMocks.setCourseScrap.mockResolvedValue({ scrapped: true, scrapCount: 5 });
    const result = await addCourseScrap(actor, "course-slug", new Date("2026-07-22T00:00:00.000Z"));
    expect(queryMocks.countRecentUserScraps).toHaveBeenCalledWith("user-1", new Date("2026-07-21T23:59:00.000Z"));
    expect(queryMocks.setCourseScrap).toHaveBeenCalledWith("user-1", "course-1", true);
    expect(result.data).toEqual({ scrapped: true, scrapCount: 5 });
  });

  it("keeps a repeated scrap request idempotent without rate checking", async () => {
    queryMocks.selectCourseScrap.mockResolvedValue({ id: "scrap-1" });
    queryMocks.setCourseScrap.mockResolvedValue({ scrapped: true, scrapCount: 5 });
    await addCourseScrap(actor, "course-slug");
    expect(queryMocks.countRecentUserScraps).not.toHaveBeenCalled();
  });

  it("removes a scrap", async () => {
    queryMocks.setCourseScrap.mockResolvedValue({ scrapped: false, scrapCount: 3 });
    const result = await removeCourseScrap(actor, "course-slug");
    expect(queryMocks.setCourseScrap).toHaveBeenCalledWith("user-1", "course-1", false);
    expect(result.data.scrapped).toBe(false);
  });
});
