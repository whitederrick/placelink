import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMocks = vi.hoisted(() => ({
  countRecentSupportCasesByReporter: vi.fn(),
  insertCustomerSupportCase: vi.fn(),
  selectSupportCases: vi.fn(),
  selectSupportCase: vi.fn(),
  updateSupportCaseTransaction: vi.fn(),
  createSupportCaseEntryTransaction: vi.fn(),
}));
vi.mock("./queries", () => queryMocks);

import {
  addSupportCaseEntry,
  createCustomerSupportCase,
  getSupportCase,
  listSupportCases,
  updateSupportCase,
} from "./service";

const admin = { id: "admin-1", type: "HUMAN" as const, role: "ADMIN" as const };
const user = { id: "user-1", type: "HUMAN" as const, role: "USER" as const };
const supportCase = {
  id: "case-1",
  type: "REPORT" as const,
  priority: "HIGH" as const,
  status: "OPEN" as const,
  subject: "광고성 코스 신고",
  description: "반복적인 광고 문구가 있습니다.",
  reporter: { id: "user-1", nickname: "민지", email: "minji@example.test" },
  assignee: null,
  dueAt: new Date("2026-09-04T00:00:00.000Z"),
  createdAt: new Date("2026-09-03T00:00:00.000Z"),
  updatedAt: new Date("2026-09-03T00:00:00.000Z"),
  resolvedAt: null,
  closedAt: null,
  targetType: "Course",
  targetId: "course-1",
  _count: { entries: 1 },
  entries: [
    {
      id: "entry-1",
      kind: "CUSTOMER_MESSAGE" as const,
      authorId: "user-1",
      authorType: "HUMAN" as const,
      body: "검토해 주세요.",
      createdAt: new Date("2026-09-03T00:00:00.000Z"),
    },
  ],
};

describe("support case operations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects non-admin access", async () => {
    await expect(listSupportCases(user)).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
  });

  it("creates a customer case without collecting separate contact details", async () => {
    queryMocks.countRecentSupportCasesByReporter.mockResolvedValue(0);
    queryMocks.insertCustomerSupportCase.mockResolvedValue({
      id: "case-new",
      createdAt: new Date("2026-09-04T00:00:00.000Z"),
    });
    await expect(
      createCustomerSupportCase(user, {
        type: "REPORT",
        subject: "부적절한 코스 신고",
        description: "광고성 문구가 반복되어 확인을 요청합니다.",
        targetType: "Course",
        targetId: "course-1",
      }),
    ).resolves.toEqual({
      data: {
        id: "case-new",
        createdAt: "2026-09-04T00:00:00.000Z",
      },
    });
    expect(queryMocks.insertCustomerSupportCase).toHaveBeenCalledWith(
      user,
      expect.not.objectContaining({ email: expect.anything() }),
    );
  });

  it("limits each user to five new cases per hour", async () => {
    queryMocks.countRecentSupportCasesByReporter.mockResolvedValue(5);
    await expect(
      createCustomerSupportCase(user, {
        type: "INQUIRY",
        subject: "코스 저장 문의",
        description: "저장한 코스를 다시 찾는 방법을 알고 싶습니다.",
      }),
    ).rejects.toMatchObject({
      code: "SUPPORT_CASE_RATE_LIMITED",
      status: 429,
    });
    expect(queryMocks.insertCustomerSupportCase).not.toHaveBeenCalled();
  });

  it("rejects deceptive control characters in customer text", async () => {
    await expect(
      createCustomerSupportCase(user, {
        type: "INQUIRY",
        subject: "코스\u202e문의",
        description: "문의 내용을 충분히 길게 작성했습니다.",
      }),
    ).rejects.toBeDefined();
    expect(queryMocks.countRecentSupportCasesByReporter).not.toHaveBeenCalled();
  });

  it("returns filtered support case summaries", async () => {
    queryMocks.selectSupportCases.mockResolvedValue({
      records: [supportCase],
      nextCursor: "case-next",
    });
    await expect(
      listSupportCases(admin, { type: "REPORT", priority: "HIGH" }),
    ).resolves.toMatchObject({
      data: [{ id: "case-1", entryCount: 1, reporter: { nickname: "민지" } }],
      meta: { nextCursor: "case-next" },
    });
  });

  it("returns case detail and chronological entries", async () => {
    queryMocks.selectSupportCase.mockResolvedValue(supportCase);
    await expect(getSupportCase(admin, "case-1")).resolves.toMatchObject({
      data: {
        id: "case-1",
        targetType: "Course",
        entries: [{ id: "entry-1", kind: "CUSTOMER_MESSAGE" }],
      },
    });
  });

  it("updates a case through the audited transaction", async () => {
    queryMocks.updateSupportCaseTransaction.mockResolvedValue({
      outcome: "updated",
      record: {
        id: "case-1",
        status: "IN_PROGRESS",
        priority: "HIGH",
        assigneeUserId: "admin-1",
        dueAt: supportCase.dueAt,
        updatedAt: new Date("2026-09-03T01:00:00.000Z"),
      },
    });
    await expect(
      updateSupportCase(admin, "case-1", {
        status: "IN_PROGRESS",
        assignment: "SELF",
        reason: "담당자가 검토를 시작합니다.",
        expectedUpdatedAt: supportCase.updatedAt.toISOString(),
      }),
    ).resolves.toMatchObject({
      data: { status: "IN_PROGRESS", assigneeUserId: "admin-1" },
    });
  });

  it("exposes optimistic update conflicts", async () => {
    queryMocks.updateSupportCaseTransaction.mockResolvedValue({
      outcome: "conflict",
    });
    await expect(
      updateSupportCase(admin, "case-1", {
        priority: "URGENT",
        reason: "처리기한이 임박했습니다.",
        expectedUpdatedAt: supportCase.updatedAt.toISOString(),
      }),
    ).rejects.toMatchObject({ code: "SUPPORT_CASE_CONFLICT", status: 409 });
  });

  it("adds replies and internal notes through the audited transaction", async () => {
    queryMocks.createSupportCaseEntryTransaction.mockResolvedValue({
      id: "entry-2",
      kind: "INTERNAL_NOTE",
      authorId: "admin-1",
      body: "광고성 문구 여부를 검토 중입니다.",
      createdAt: new Date("2026-09-03T01:00:00.000Z"),
      caseUpdatedAt: new Date("2026-09-03T01:00:00.000Z"),
    });
    await expect(
      addSupportCaseEntry(admin, "case-1", {
        kind: "INTERNAL_NOTE",
        body: "광고성 문구 여부를 검토 중입니다.",
      }),
    ).resolves.toMatchObject({
      data: { id: "entry-2", kind: "INTERNAL_NOTE" },
    });
  });
});
