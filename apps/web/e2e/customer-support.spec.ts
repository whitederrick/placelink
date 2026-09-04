import { expect, test } from "./test";

test("lets a signed-in user submit a support request on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ko/create");
  await page.getByRole("link", { name: "로그인하고 시작" }).click();
  await page.getByRole("button", { name: /Development User.*지훈/ }).click();

  await page.goto("/ko/my");
  await page.getByRole("link", { name: /접수 화면 열기/ }).click();
  await expect(
    page.getByRole("heading", { name: "무엇을 도와드릴까요?" }),
  ).toBeVisible();
  await page.getByLabel("콘텐츠 신고").check();
  await page.getByLabel("제목").fill("부적절한 코스를 신고합니다");
  await page
    .getByLabel("자세한 내용")
    .fill("광고성 문구가 반복되어 운영팀의 확인을 요청합니다.");

  const createResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().endsWith("/api/v1/support-cases"),
  );
  await page.getByRole("button", { name: "접수하기" }).click();
  const response = await createResponse;
  expect(response.status()).toBe(201);
  const supportCaseId = (await response.json()).data.id as string;

  await expect(
    page.getByRole("heading", { name: "접수가 완료됐어요" }),
  ).toBeVisible();
  await expect(page.getByText(`접수 번호: ${supportCaseId}`)).toBeVisible();

  const detail = await page.request.get(
    `/api/v1/admin/support-cases/${supportCaseId}`,
  );
  expect(detail.status()).toBe(200);
  expect((await detail.json()).data).toMatchObject({
    type: "REPORT",
    subject: "부적절한 코스를 신고합니다",
    reporter: { id: "seed-user-jihoon" },
    entries: [{ kind: "CUSTOMER_MESSAGE" }],
  });
});
