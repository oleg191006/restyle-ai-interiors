import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const photo = () => path.join(test.info().project.testDir, "..", "scripts", "photos", "living-room.jpg");

async function generate(page: Page) {
  await page.getByLabel("Room photo").setInputFiles(photo());
  await page.getByRole("button", { name: /^Generate/ }).click();
}

// The first step of the paywall funnel (ADR 0010): a guest uses up the guest allowance, is
// offered to sign in, creates an account and lands back in the tool with the Free allowance.
test("a guest who runs out of generations signs up and continues", async ({ page }) => {
  await page.goto("/en/redesign?room=living-room&style=loft");
  await expect(page.getByText("Today: 0 of 2 generations")).toBeVisible();

  for (const n of [1, 2]) {
    await generate(page);
    await expect(page.getByRole("img", { name: "After" })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(`Today: ${n} of 2 generations`)).toBeVisible();
  }

  await generate(page);
  await expect(page.getByText("Today's generations without an account are used up.")).toBeVisible();
  await page.getByRole("link", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/en\/account\?next=/);
  await page.getByRole("button", { name: "No account? Create one" }).click();
  await page.getByLabel("Email").fill(`e2e-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();

  // Back where they were, same room and style, with the Free allowance.
  await expect(page).toHaveURL(/\/en\/redesign\?room=living-room&style=loft$/);
  await expect(page.getByText("Today: 0 of 5 generations")).toBeVisible();
  await generate(page);
  await expect(page.getByRole("img", { name: "After" })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("Today: 1 of 5 generations")).toBeVisible();
});

test("the account page is not indexed and rejects a wrong password", async ({ page }) => {
  await page.goto("/uk/account");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Пароль").fill("wrong-password");
  await page.getByRole("button", { name: "Увійти" }).click();
  await expect(page.getByText("Невірний email або пароль.")).toBeVisible();
});
