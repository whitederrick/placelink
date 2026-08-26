import { expect, test } from "./test";

test("uses Kakao Map for Korean course stops", async ({ page }) => {
  await page.goto("/ko/courses/seed-date-course-1");

  const links = page.getByRole("link", { name: "카카오맵에서 보기" });
  await expect(links).toHaveCount(3);
  await expect(links.first()).toHaveAttribute(
    "href",
    /^https:\/\/map\.kakao\.com\/link\/map\//,
  );
});

test("uses Google Maps for English course stops", async ({ page }) => {
  await page.goto("/en/courses/seed-date-course-1");

  const links = page.getByRole("link", { name: "Open in Google Maps" });
  await expect(links).toHaveCount(3);
  await expect(links.first()).toHaveAttribute(
    "href",
    /^https:\/\/www\.google\.com\/maps\/search\//,
  );
});
