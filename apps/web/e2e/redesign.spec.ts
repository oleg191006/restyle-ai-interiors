import path from "node:path";
import { expect, test } from "@playwright/test";
import sharp from "sharp";

// A phone-sized photo with GPS coordinates in EXIF, built from a committed eval photo.
async function phonePhoto() {
  return sharp(path.join(test.info().project.testDir, "..", "scripts", "photos", "kitchen.jpg"))
    .resize(1600, 1200)
    .jpeg()
    .withExif({
      IFD0: { Make: "TestPhone" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "50/1 27/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "30/1 31/1 0/1" },
    })
    .toBuffer();
}

test("a photo goes through upload, queue and worker and comes back redesigned", async ({ page, request }) => {
  await page.goto("/en/redesign?room=kitchen&style=loft");

  // Landing pages link here with room and style preselected.
  await expect(page.getByRole("radio", { name: "Kitchen" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Industrial loft" })).toBeChecked();

  await page.getByLabel("Room photo").setInputFiles({ name: "room.jpg", mimeType: "image/jpeg", buffer: await phonePhoto() });
  await page.getByRole("button", { name: "Generate" }).click();

  const before = page.getByRole("img", { name: "Before" });
  const after = page.getByRole("img", { name: "After" });
  await expect(after).toBeVisible({ timeout: 45_000 });

  // The stored input is what the browser made of the photo: ≤ 504 px and no EXIF (ADR 0005).
  const input = await (await request.get((await before.getAttribute("src"))!)).body();
  const meta = await sharp(input).metadata();
  expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(504);
  expect(meta.exif).toBeUndefined();

  // The fake provider returns 1024×768, like the real model.
  const output = await sharp(await (await request.get((await after.getAttribute("src"))!)).body()).metadata();
  expect([output.width, output.height]).toEqual([1024, 768]);
});

test("the worker refuses calls that are not signed by QStash", async ({ request }) => {
  const res = await request.post("/api/generations/run", { data: { id: "anything" } });
  expect(res.status()).toBe(401);
});

test("unknown pages are real 404s and mixed-case URLs redirect to lowercase", async ({ request }) => {
  expect((await request.get("/en/ideas/kitchen/no-such-style")).status()).toBe(404);
  const res = await request.get("/EN/ideas/Kitchen", { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers().location).toMatch(/^(http:\/\/localhost:3000)?\/en\/ideas\/kitchen$/);
});

// The tool maps API error codes to messages and next steps. The API is stubbed in the browser,
// so the site-wide cap does not need 50 real generations. Found missing: limit errors carry the
// plan ("limit_global:anonymous"), and the site-wide message had silently become "failed".
test.describe("limit messages", () => {
  for (const [body, message, link] of [
    [{ error: "limit_global", plan: "anonymous" }, "the site daily limit is reached", null],
    [{ error: "limit_plan", plan: "anonymous" }, "without an account are used up", "Sign in"],
    [{ error: "limit_plan", plan: "free" }, "Free generations are used up", "Upgrade to Pro"],
    [{ error: "rate_limited" }, "Too many attempts from your network", null],
  ] as const) {
    test(`${body.error}${"plan" in body ? `:${body.plan}` : ""}`, async ({ page }) => {
      await page.route("**/api/uploads", (route) => route.fulfill({ status: 429, json: body }));
      await page.goto("/en/redesign");
      await page.getByLabel("Room photo").setInputFiles(path.join(test.info().project.testDir, "..", "scripts", "photos", "kitchen.jpg"));
      await page.getByRole("button", { name: "Generate" }).click();
      await expect(page.getByText(message)).toBeVisible();
      if (link) await expect(page.getByRole("link", { name: link })).toBeVisible();
    });
  }
});
