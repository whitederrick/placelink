import { expect, test } from "./test";

test("continues the home feed after the server-rendered first page", async ({
  page,
}) => {
  await page.goto("/ko?take=2");

  await expect(page.locator(".course-card")).toHaveCount(2);
  await page.locator(".feed-pagination-state").scrollIntoViewIfNeeded();

  await expect(page.locator(".course-card")).toHaveCount(5);
  await expect(
    page.getByText("지금 볼 수 있는 코스를 모두 확인했어요."),
  ).toBeVisible();
});
