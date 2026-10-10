import { expect, test, type Page } from "@playwright/test";

async function addRoseBasketToBag(page: Page) {
  await page.goto("/products/gilded-rose-mehndi-basket");
  await page.getByRole("button", { name: "Medium" }).click();
  await expect(page.getByText("₹2,199").first()).toBeVisible();
  await page.getByRole("button", { name: "Add to bag", exact: true }).first().click();
  await expect(page.getByText("added to your bag")).toBeVisible();
}

async function fillCheckout(page: Page) {
  const form = page.getByRole("form", { name: "Checkout" });
  await form.getByLabel("Email", { exact: true }).fill("guest@example.com");
  await form.getByLabel("Mobile number").fill("9876543210");
  await form.getByLabel("Full name").fill("Test Guest");
  await form.getByLabel("Address line 1").fill("12 Residency Road");
  await form.getByLabel("City").fill("Srinagar");
  await form.getByLabel("PIN code").fill("190001");
  await form.getByLabel("State / UT").selectOption("Jammu and Kashmir");
}

test.describe("discovery", () => {
  test("home → category → filter → product", async ({ page, isMobile }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /Celebrate/ })).toBeVisible();

    await page
      .locator('section[aria-labelledby="categories-title"]')
      .getByRole("link", { name: /Mehndi Baskets/ })
      .click();
    await expect(page).toHaveURL(/\/category\/mehndi-baskets/);
    await expect(page.getByRole("heading", { level: 1, name: "Mehndi Baskets" })).toBeVisible();

    if (isMobile) {
      await page.getByRole("button", { name: /^Filter/ }).click();
      await page.getByRole("dialog").getByText("In stock only").click();
      await page.getByRole("button", { name: /Show \d+ result/ }).click();
    } else {
      await page.getByText("In stock only").click();
    }
    await expect(page).toHaveURL(/stock=in/);

    await page.getByRole("link", { name: "Lilac Wicker Mehndi Basket" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Lilac Wicker Mehndi Basket" })).toBeVisible();
  });

  test("search suggestions and results page", async ({ page }) => {
    await page.goto("/search?q=macaron");
    await expect(page.getByRole("link", { name: "Pastel Macaron Gift Box" })).toBeVisible();
    await page.goto("/search?q=zzzz");
    await expect(page.getByText(/No results for/)).toBeVisible();
  });
});

test.describe("purchase journey", () => {
  test("guest adds a variant, adjusts quantity and completes a simulated payment", async ({ page }) => {
    await addRoseBasketToBag(page);

    await page.goto("/cart");
    await page.getByRole("button", { name: "Increase quantity" }).first().click();
    await expect(page.getByText("₹4,398").first()).toBeVisible();

    await page.getByRole("link", { name: "Proceed to checkout" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Checkout" })).toBeVisible();
    await fillCheckout(page);

    // The pay button shows the server-side quote total.
    const pay = page.getByRole("button", { name: /^Pay ₹/ });
    await expect(pay).toBeEnabled();
    await pay.click();
    await page.getByRole("button", { name: "Simulate successful payment" }).click();

    await expect(page).toHaveURL(/\/checkout\/success\?order=EE/);
    await expect(page.getByRole("heading", { name: /Thank you, Test/ })).toBeVisible();
    // Previous routes stay mounted but hidden (React Activity), so only match visible elements.
    await expect(
      page.getByRole("link", { name: "Gilded Rose Mehndi Basket", exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();

    // The order is visible from the account area after signing in.
    await page.goto("/login?next=/account/orders");
    await page.getByRole("main").getByLabel("Email", { exact: true }).fill("guest@example.com");
    await page.getByLabel("Password", { exact: true }).fill("password1");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/account\/orders/);
    await expect(page.getByText(/^EE\d+/).first()).toBeVisible();
  });

  test("failed payment keeps the bag intact", async ({ page }) => {
    await addRoseBasketToBag(page);
    await page.goto("/checkout");
    await fillCheckout(page);
    await page.getByRole("button", { name: /^Pay ₹/ }).click();
    await page.getByRole("button", { name: "Simulate failed payment" }).click();
    await expect(page.getByText("Payment didn't go through")).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole("complementary", { name: "Order summary" }).getByText("Gilded Rose Mehndi Basket")).toBeVisible();
  });

  test("checkout validates required fields", async ({ page }) => {
    await addRoseBasketToBag(page);
    await page.goto("/checkout");
    await page.getByRole("button", { name: /^Pay ₹/ }).click();
    await expect(page.getByText("Please enter a valid email address")).toBeVisible();
    await expect(page.getByText("Enter a valid 6-digit PIN code")).toBeVisible();
  });
});

test.describe("edge cases", () => {
  test("empty bag", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Your bag is empty" })).toBeVisible();
  });

  test("invalid and expired coupons are rejected", async ({ page }) => {
    await addRoseBasketToBag(page);
    await page.goto("/cart");
    await page.getByPlaceholder("Discount code").fill("NOPE");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("This code isn't valid.")).toBeVisible();
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await page.getByPlaceholder("Discount code").fill("SUMMER15");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("This code has expired.")).toBeVisible();
  });

  test("out-of-stock product cannot be added", async ({ page }) => {
    await page.goto("/products/engraved-brass-pitcher");
    await expect(page.getByText("Out of stock")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sold out" }).first()).toBeDisabled();
  });

  test("account pages ask guests to sign in", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
  });

  test("unknown routes show the 404 page", async ({ page }) => {
    // Unknown slugs resolve inside a streamed Suspense boundary, so Next.js keeps HTTP 200
    // and marks the page noindex (documented streaming behaviour).
    await page.goto("/products/does-not-exist");
    await expect(page.getByRole("heading", { name: /Lost the/ })).toBeVisible();
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  });
});

test.describe("navigation", () => {
  test("mobile menu opens and navigates", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("link", { name: "Collections", exact: true }).click();
    await expect(page).toHaveURL(/\/collections$/);
  });

  test("header search is keyboard accessible", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop header");
    await page.goto("/");
    await page.getByRole("button", { name: "Search" }).click();
    await page.keyboard.type("brass");
    await expect(page.getByRole("dialog").getByRole("link", { name: /Heritage Brass Serving Tray/ })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/search\?q=brass/);
  });

  test("no horizontal overflow on key pages", async ({ page }) => {
    for (const path of ["/", "/shop", "/products/gilded-rose-mehndi-basket", "/checkout", "/about"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
