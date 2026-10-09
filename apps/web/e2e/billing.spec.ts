import { expect, test, type Page } from "@playwright/test";

// The paid half of the funnel against Stripe test mode (ADR 0011): Checkout → webhook → Pro →
// Customer Portal → cancel → webhook → "Pro until …". Needs STRIPE_SECRET_KEY and
// STRIPE_WEBHOOK_SECRET in .env.local and `stripe listen` forwarding to /api/stripe/webhook;
// skipped when billing is not configured (CI has no Stripe keys).

test.describe.configure({ timeout: 180_000 });

// The config adds X-Forwarded-For to every request, including the Stripe pages' own calls to
// Stripe's API, where a custom header fails the CORS preflight and the portal never loads.
// This test makes no generations, so it does not need its own IP.
test.use({ extraHTTPHeaders: {} });

async function signUp(page: Page) {
  await page.goto("/en/account");
  await page.getByRole("button", { name: "No account? Create one" }).click();
  await page.getByLabel("Email").fill(`billing-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Plan: Free")).toBeVisible();
}

test("a Free user subscribes, gets Pro, and cancels in the portal", async ({ page, request }) => {
  const account = await (await request.get("/api/account")).json();
  test.skip(!account.billing, "Stripe is not configured");

  await signUp(page);
  // A new account lands in either arm of the paywall experiment (ADR 0012): with or without
  // the 7-day trial. Both go through the same Checkout and webhook path.
  await expect(page.getByText(/\$9 a month.*30 generations a day/)).toBeVisible();
  await page.getByRole("button", { name: /^(Upgrade to Pro|Start 7-day free trial)$/ }).click();

  // Stripe-hosted Checkout, test card 4242 4242 4242 4242.
  await page.waitForURL(/checkout\.stripe\.com/);
  await page.locator("#cardNumber").fill("4242424242424242");
  await page.locator("#cardExpiry").fill("12 / 34");
  await page.locator("#cardCvc").fill("123");
  await page.locator("#billingName").fill("Test Person");
  const address = page.locator("#billingAddressLine1");
  if (await address.isVisible()) {
    await address.fill("Khreshchatyk 1");
    await page.locator("#billingLocality").fill("Kyiv");
    const region = page.locator("#billingAdministrativeArea");
    if (await region.isVisible()) await region.selectOption({ index: 1 });
    await page.locator("#billingPostalCode").fill("01001");
  }
  await page.getByTestId("hosted-payment-submit-button").click();

  // Back on our site; Pro appears once the webhook has been processed.
  await page.waitForURL(/\/en\/account\?checkout=success/, { timeout: 60_000 });
  await expect(page.getByText("Plan: Pro")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Next payment on/)).toBeVisible();
  await expect(page.getByText("Today: 0 of 30 generations")).toBeVisible();

  // Customer Portal: cancel at the end of the period. Stripe's portal renders some actions as
  // <a> without href (no link role), so its own data-test attributes are the stable handles.
  await page.getByRole("button", { name: "Manage subscription" }).click();
  await page.waitForURL(/billing\.stripe\.com/);
  await page.locator('[data-test="cancel-subscription"]').click();
  await page.locator('[data-test="confirm"]').click();
  await expect(page.locator('[data-test="confirm"]')).toBeHidden();

  // The plan state comes from the customer.subscription.updated webhook, not from the redirect.
  await page.goto("/en/account");
  await expect(page.getByText(/Subscription cancelled: Pro until/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Plan: Pro")).toBeVisible();
});
