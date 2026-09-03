import { expect, test } from "./test";

test("lets an administrator remove a happening from home", async ({ page }) => {
  await page.goto("/ko/create");
  await page.getByRole("link", { name: "로그인하고 시작" }).click();
  await page
    .getByRole("button", { name: /Development User.*지훈/ })
    .click();

  await page.goto("/ko/studio/happenings");
  await expect(page.getByRole("heading", { name: "홈 앵커 큐레이션" })).toBeVisible();
  await expect(page.locator(".curation-list article")).toHaveCount(3);

  const firstHappening = page.locator(".curation-list article").first();
  await firstHappening.getByRole("button", { name: "노출 해제" }).click();

  await expect(firstHappening.getByRole("button", { name: "홈에 노출" })).toBeVisible();
  await expect(firstHappening).not.toHaveClass(/is-anchor/);
});
