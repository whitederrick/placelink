import { expect, test } from "./test";

test("lets an administrator inspect and filter audit logs", async ({
  page,
}) => {
  await page.goto("/ko/create");
  await page.getByRole("link", { name: "로그인하고 시작" }).click();
  await page.getByRole("button", { name: /Development User.*지훈/ }).click();

  await page.goto("/ko/studio/audit-logs");
  await expect(page.getByRole("heading", { name: "감사로그" })).toBeVisible();
  await expect(page.getByText("happening.anchor_assigned")).toBeVisible();
  await page.getByText("변경 전후 보기").click();
  await expect(page.getByText('"isAnchor": true')).toBeVisible();

  await page.getByRole("link", { name: "Happening", exact: true }).click();
  await expect(page.getByText("happening.anchor_assigned")).toBeVisible();

  const response = await page.request.get(
    "/api/v1/admin/audit-logs?actorType=HUMAN&targetType=Happening",
  );
  expect(response.status()).toBe(200);
  expect((await response.json()).data[0]).toMatchObject({
    actorType: "HUMAN",
    targetType: "Happening",
    targetId: "seed-happening-1",
  });
});
