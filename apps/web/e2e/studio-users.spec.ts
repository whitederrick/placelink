import { expect, test } from "./test";

test("lets an administrator inspect user activity and relationships", async ({
  page,
}) => {
  await page.goto("/ko/create");
  await page.getByRole("link", { name: "로그인하고 시작" }).click();
  await page.getByRole("button", { name: /Development User.*지훈/ }).click();

  await page.goto("/ko/studio/users");
  await expect(
    page.getByRole("heading", { name: "사용자 관리" }),
  ).toBeVisible();
  await expect(page.locator(".studio-user-list > a")).toHaveCount(2);

  await page.getByLabel("사용자 검색").fill("민지");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.locator(".studio-user-list > a")).toHaveCount(1);
  await expect(page.getByText("minji@example.test")).toBeVisible();

  const listResponse = await page.request.get(
    "/api/v1/admin/users?search=%EB%AF%BC%EC%A7%80",
  );
  expect(listResponse.status()).toBe(200);
  expect((await listResponse.json()).data).toHaveLength(1);

  await page.locator(".studio-user-list > a").click();
  await expect(page.getByRole("heading", { name: "민지" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "계정 정보" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "커플 연결" })).toBeVisible();
  await expect(page.getByText("지훈♥민지")).toBeVisible();
  await expect(page.getByRole("heading", { name: "생성 코스" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "저장한 코스" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "최근 활동" })).toBeVisible();

  const detailResponse = await page.request.get(
    "/api/v1/admin/users/seed-user-minji",
  );
  expect(detailResponse.status()).toBe(200);
  expect((await detailResponse.json()).data).toMatchObject({
    id: "seed-user-minji",
    currentCouple: { displayName: "지훈♥민지" },
  });

  await page.getByLabel("변경할 상태").selectOption("SUSPENDED");
  await page.getByLabel("변경 사유").fill("반복적인 서비스 운영 정책 위반");
  await page.getByRole("button", { name: "계정 상태 저장" }).click();
  await expect(
    page.getByText("계정 상태와 감사로그를 저장했습니다."),
  ).toBeVisible();

  const updated = await page.request.get("/api/v1/admin/users/seed-user-minji");
  expect((await updated.json()).data).toMatchObject({ status: "SUSPENDED" });
});
