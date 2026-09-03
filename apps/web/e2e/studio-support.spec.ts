import { expect, test } from "./test";

test("lets an administrator triage a report with an audited note", async ({
  page,
}) => {
  await page.goto("/ko/create");
  await page.getByRole("link", { name: "로그인하고 시작" }).click();
  await page.getByRole("button", { name: /Development User.*지훈/ }).click();

  await page.goto("/ko/studio/support");
  await expect(
    page.getByRole("heading", { name: "문의·신고 관리" }),
  ).toBeVisible();
  await expect(page.locator(".support-case-list > a")).toHaveCount(2);
  await page.getByRole("link", { name: "신고", exact: true }).click();
  await expect(page.locator(".support-case-list > a")).toHaveCount(1);
  await page.locator(".support-case-list > a").click();

  await expect(
    page.getByRole("heading", { name: "코스 설명에 광고성 문구가 있습니다" }),
  ).toBeVisible();
  await page.getByLabel("상태").selectOption("IN_PROGRESS");
  await page.getByLabel("우선순위").selectOption("URGENT");
  await page.getByLabel("담당자").selectOption("SELF");
  await page
    .getByLabel("변경 사유")
    .fill("광고성 콘텐츠 여부를 우선 검토합니다.");
  const updateResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response
        .url()
        .endsWith("/api/v1/admin/support-cases/seed-support-report"),
  );
  await page
    .getByRole("button", { name: "처리 상태 변경", exact: true })
    .click();
  expect((await updateResponse).status()).toBe(200);
  await expect(
    page.getByText("변경사항과 감사로그를 저장했습니다."),
  ).toBeVisible();

  await page.getByLabel("기록 유형").selectOption("INTERNAL_NOTE");
  await page
    .getByLabel("내용")
    .fill("코스 원문과 작성자의 다른 공개 코스를 함께 확인합니다.");
  const entryResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response
        .url()
        .endsWith("/api/v1/admin/support-cases/seed-support-report/entries"),
  );
  await page
    .getByRole("button", { name: "처리 기록 추가", exact: true })
    .click();
  expect((await entryResponse).status()).toBe(201);
  await expect(
    page.getByText("처리 기록과 감사로그를 추가했습니다."),
  ).toBeVisible();
  await expect(
    page.getByText("코스 원문과 작성자의 다른 공개 코스를 함께 확인합니다."),
  ).toBeVisible();

  const detail = await page.request.get(
    "/api/v1/admin/support-cases/seed-support-report",
  );
  expect(detail.status()).toBe(200);
  expect((await detail.json()).data).toMatchObject({
    status: "IN_PROGRESS",
    priority: "URGENT",
    assignee: { id: "seed-user-jihoon" },
  });
});
