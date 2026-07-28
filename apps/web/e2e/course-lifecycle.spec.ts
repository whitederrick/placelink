import type { Page } from "@playwright/test";
import { expect, test } from "./test";

test.setTimeout(90_000);

async function signInAsJihoon(page: Page) {
  await page
    .getByRole("button", {
      name: /Development User.*지훈/,
    })
    .click();
}

test("creates, publishes, scraps, and opens a shared course", async ({
  browser,
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
  });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://localhost:3000",
  });

  await page.goto("/ko/create");
  await page.getByRole("link", { name: "로그인하고 시작" }).click();
  await signInAsJihoon(page);
  await expect(page).toHaveURL(/\/ko\/create$/);

  await page.getByRole("button", { name: "이 장소로 시작" }).click();
  await expect(page).toHaveURL(/\/ko\/create\?step=2&draft=/);

  await page.locator('button[aria-label$=" 추가"]').first().click();
  await page.getByLabel(/팁$/).first().fill("사진은 입장 직후가 가장 한적해요");
  await page.getByRole("button", { name: "다음 단계" }).click();
  await expect(page).toHaveURL(/\/ko\/create\?step=3&draft=/);

  const courseTitle = "Playwright 성수 데이트";
  await page.getByLabel("코스 이름").fill(courseTitle);
  await page
    .getByLabel("한 줄 소개")
    .fill("앵커부터 카페까지 직접 이어 만든 회귀 테스트 코스");
  const publishResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/api\/v1\/courses\/[^/]+\/publish\?locale=ko$/.test(response.url()),
  );
  await page.getByRole("button", { name: "저장하고 공유" }).click();
  expect((await publishResponse).status()).toBe(200);

  await expect(page).toHaveURL(/\/ko\/courses\/[^?]+\?published=1$/, {
    timeout: 30_000,
  });
  await expect(page.getByText("코스가 발행됐어요.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: courseTitle, exact: true }),
  ).toBeVisible();

  const scrapButton = page.getByRole("button", { name: /이 코스 저장하기/ });
  await scrapButton.click();
  await expect(page.getByRole("button", { name: /저장됨/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "코스 공유" }).click();
  const sharedUrl = await page.evaluate(() => navigator.clipboard.readText());
  expect(sharedUrl).toMatch(/\/ko\/courses\/[^?]+\?published=1$/);

  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.goto(sharedUrl);
  await expect(
    publicPage.getByRole("heading", { name: courseTitle, exact: true }),
  ).toBeVisible();
  await expect(
    publicPage.getByRole("button", { name: "코스 공유" }),
  ).toBeVisible();
  await publicContext.close();
});
