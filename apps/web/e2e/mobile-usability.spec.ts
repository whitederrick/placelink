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

async function expectTouchTarget(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect(box?.width).toBeGreaterThanOrEqual(44);
}

test("keeps the core planning flow clear on a phone", async ({ page }) => {
  await page.goto("/ko");
  await expect(
    page.getByRole("heading", {
      name: /오늘 (아침|오후|저녁|밤), 어디서 사랑할까요\?/,
    }),
  ).toBeVisible();
  await expect(page.locator(".tabbar")).toBeVisible();
  await expect(page.locator(".desktop-nav")).toBeHidden();
  await expectTouchTarget(page, ".tab-item");
  await expectNoHorizontalOverflow(page);

  await page.goto("/ko/explore");
  await expect(page.getByLabel("장소 또는 주소 검색")).toBeVisible();
  await expect(page.getByLabel("장소 또는 주소 검색")).toHaveCSS(
    "font-size",
    "16px",
  );
  await expectTouchTarget(page, ".chip-row a");
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

  await page.goto("/ko/courses/seed-date-course-1");
  await expect(page.getByRole("button", { name: "코스 공유" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
