import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMocks = vi.hoisted(() => ({
  selectHappeningsForCuration: vi.fn(),
  updateHappeningAnchorTransaction: vi.fn(),
}));
vi.mock("./queries", () => queryMocks);

import { listHappeningsForCuration, updateHappeningAnchor } from "./service";

const admin = { id: "admin-1", type: "HUMAN" as const, role: "ADMIN" as const };
const user = { id: "user-1", type: "HUMAN" as const, role: "USER" as const };

describe("admin anchor curation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists happenings with localized operational fields", async () => {
    queryMocks.selectHappeningsForCuration.mockResolvedValue([
      {
        id: "happening-1",
        status: "ACTIVE",
        startsAt: new Date("2026-08-20T00:00:00.000Z"),
        endsAt: new Date("2026-08-30T00:00:00.000Z"),
        isAnchor: true,
        translations: [{ title: "성수 전시" }],
        place: { translations: [{ name: "성수 아카이브" }] },
      },
    ]);

    await expect(
      listHappeningsForCuration(admin, { locale: "ko", anchor: "true" }),
    ).resolves.toMatchObject({
      data: [
        {
          id: "happening-1",
          title: "성수 전시",
          placeName: "성수 아카이브",
          isAnchor: true,
        },
      ],
    });
    expect(queryMocks.selectHappeningsForCuration).toHaveBeenCalledWith({
      locale: "ko",
      anchor: true,
      take: 50,
    });
  });

  it("rejects non-admin service callers", async () => {
    await expect(
      updateHappeningAnchor(user, "happening-1", { isAnchor: true }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("updates the anchor through the audited transaction", async () => {
    queryMocks.updateHappeningAnchorTransaction.mockResolvedValue({
      id: "happening-1",
      isAnchor: true,
      changed: true,
    });

    await expect(
      updateHappeningAnchor(admin, "happening-1", { isAnchor: true }),
    ).resolves.toEqual({
      data: { id: "happening-1", isAnchor: true, changed: true },
    });
    expect(queryMocks.updateHappeningAnchorTransaction).toHaveBeenCalledWith(
      admin,
      "happening-1",
      true,
    );
  });

  it("returns a bounded not-found error", async () => {
    queryMocks.updateHappeningAnchorTransaction.mockResolvedValue(null);
    await expect(
      updateHappeningAnchor(admin, "missing", { isAnchor: false }),
    ).rejects.toMatchObject({ code: "HAPPENING_NOT_FOUND", status: 404 });
  });
});
