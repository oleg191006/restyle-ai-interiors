import { expect, test, type Page } from "@playwright/test";

// What search engines read rather than what people see: the site name, icons, canonical and
// hreflang, and structured data. A regression here is invisible in the browser.

async function jsonLd(page: Page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((b) => JSON.parse(b));
}

test("the home page names the site and has its own icons", async ({ page, request }) => {
  await page.goto("/uk");
  const site = (await jsonLd(page)).find((d) => d["@type"] === "WebSite");
  expect(site).toMatchObject({ name: "Restyle", inLanguage: "uk-UA" });
  expect(site.url).toMatch(/\/uk$/);

  for (const href of ["/favicon.ico", ...(await page.locator('link[rel="icon"], link[rel="apple-touch-icon"]').evaluateAll((ls) => ls.map((l) => l.getAttribute("href")!)))]) {
    const res = await request.get(href);
    expect(res.status(), href).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/^image\//);
  }
});

test("a landing page has a self canonical, hreflang alternates and FAQ data", async ({ page }) => {
  await page.goto("/en/ideas/living-room/japandi");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/ideas\/living-room\/japandi$/);
  await expect(page.locator('link[rel="alternate"][hreflang="uk-UA"]')).toHaveAttribute("href", /\/uk\/ideas\/living-room\/japandi$/);
  await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute("href", /\/uk\/ideas\/living-room\/japandi$/);

  const types = (await jsonLd(page)).map((d) => d["@type"]);
  expect(types).toEqual(expect.arrayContaining(["FAQPage", "BreadcrumbList"]));
});
