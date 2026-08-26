import { expect, test } from "./test";

test("switches the hall of fame between weekly and monthly rankings", async ({
  page,
}) => {
  await page.goto("/ko");

  await expect(page.getByText("이번 주 가장 사랑받은 코스")).toBeVisible();
  await page.getByRole("link", { name: "월간", exact: true }).click();

  await expect(page).toHaveURL(/ranking=monthly/);
  await expect(page.getByText("이번 달 가장 사랑받은 코스")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "월간", exact: true }),
  ).toHaveClass(/selected/);
});
