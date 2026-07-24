import type { Page } from "@playwright/test";
import { expect, test } from "./test";

async function signInAs(page: Page, userName: "지훈" | "민지") {
  await page
    .getByRole("button", {
      name: new RegExp(`Development User.*${userName}`),
    })
    .click();
}

test("connects and disconnects two seed users through the UI", async ({
  browser,
}) => {
  const jihoonContext = await browser.newContext();
  const minjiContext = await browser.newContext();
  const jihoonPage = await jihoonContext.newPage();
  const minjiPage = await minjiContext.newPage();

  await jihoonPage.goto("/ko/my");
  await signInAs(jihoonPage, "지훈");
  await expect(jihoonPage).toHaveURL(/\/ko\/my$/);

  jihoonPage.once("dialog", (dialog) => dialog.accept());
  await jihoonPage.getByRole("button", { name: "커플 연결 해제" }).click();
  await expect(jihoonPage.getByText("SOLO ARCHIVE")).toBeVisible();

  await jihoonPage.getByRole("button", { name: "초대 링크 공유" }).click();
  await jihoonPage.getByLabel("처음 만난 날").fill("2025-03-23");
  await jihoonPage.getByRole("button", { name: "초대 링크 만들기" }).click();
  const inviteUrl = await jihoonPage.getByLabel("초대 링크 공유").inputValue();
  expect(inviteUrl).toMatch(/\/ko\/couple\/invite\/[A-Za-z0-9_-]+$/);

  const token = inviteUrl.split("/").at(-1);
  const previewPath = `/api/v1/couples/invites/${token}`;
  expect((await jihoonPage.request.get(previewPath)).status()).toBe(200);
  expect((await minjiPage.request.get(previewPath)).status()).toBe(200);
  const previewResponse = minjiPage.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().endsWith(previewPath),
  );
  await minjiPage.goto(inviteUrl);
  expect((await previewResponse).status()).toBe(200);
  await expect(
    minjiPage.getByRole("button", { name: "초대 수락하기" }),
  ).toBeVisible();
  await minjiPage.getByRole("button", { name: "초대 수락하기" }).click();

  await signInAs(minjiPage, "민지");
  await expect(minjiPage).toHaveURL(
    new RegExp(inviteUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  await minjiPage.getByRole("button", { name: "초대 수락하기" }).click();
  await expect(minjiPage).toHaveURL(/\/ko\/my$/);
  await expect(
    minjiPage.getByRole("heading", { name: "지훈❤️민지", exact: true }),
  ).toBeVisible();

  await jihoonPage.reload();
  await expect(
    jihoonPage.getByRole("heading", { name: "지훈❤️민지", exact: true }),
  ).toBeVisible();

  jihoonPage.once("dialog", (dialog) => dialog.accept());
  await jihoonPage.getByRole("button", { name: "커플 연결 해제" }).click();
  await expect(jihoonPage.getByText("SOLO ARCHIVE")).toBeVisible();
  await minjiPage.reload();
  await expect(minjiPage.getByText("SOLO ARCHIVE")).toBeVisible();

  await Promise.all([jihoonContext.close(), minjiContext.close()]);
});
