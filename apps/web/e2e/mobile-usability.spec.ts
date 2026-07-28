import type { Page } from "@playwright/test";
import { expect, test } from "./test";

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
}

test("keeps the core planning flow clear on a phone", async ({ page }) => {
  await page.goto("/ko");
  await expect(
    page.getByRole("heading", { name: "오늘은, 어디서 사랑할까요?" }),
  ).toBeVisible();
  await expect(page.locator(".tabbar")).toBeVisible();
  await expect(page.locator(".desktop-nav")).toBeHidden();
  await expectNoHorizontalOverflow(page);

  await page.goto("/ko/explore");
  await expect(page.getByLabel("장소 또는 주소 검색")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "서울 전체의 장소" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/ko/create");
  await expect(
    page.getByRole("heading", { name: "어디부터 가볼까요?" }),
  ).toBeVisible();
  await expect(page.getByText("첫 장소", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "로그인하고 시작" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
