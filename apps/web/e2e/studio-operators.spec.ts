import { expect, test } from "./test";

test("lets a super administrator assign an audited operator role", async ({
  page,
}) => {
  await page.goto("/ko/create");
  await page.getByRole("link", { name: "로그인하고 시작" }).click();
  await page.getByRole("button", { name: /Development User.*지훈/ }).click();

  await page.goto("/ko/studio/operators?search=%EB%AF%BC%EC%A7%80");
  await expect(
    page.getByRole("heading", { name: "운영자 권한" }),
  ).toBeVisible();
  await expect(page.getByText("minji@example.test")).toBeVisible();
  await page.getByLabel("운영 역할").selectOption("ANALYST");
  await page.getByLabel("변경 사유").fill("분석 업무 담당자로 지정");
  await page.getByRole("button", { name: "역할 저장" }).click();
  await expect(page.getByText("역할과 감사로그를 저장했습니다.")).toBeVisible();

  const logs = await page.request.get(
    "/api/v1/admin/audit-logs?search=studio_operator.role_updated",
  );
  expect(logs.status()).toBe(200);
  expect((await logs.json()).data[0]).toMatchObject({
    action: "studio_operator.role_updated",
    targetId: "seed-user-minji",
    after: { studioRole: "ANALYST" },
  });
});
