import { test as setup } from "@playwright/test";

/**
 * The e2e dev server compiles each route on its first visit, which can take
 * longer than a test's wait. Visit the main pages and API routes once, one at
 * a time, before the other tests start. Skipped when testing a running site.
 */
setup("warm up the dev server", async ({ page }) => {
  setup.skip(Boolean(process.env.E2E_BASE_URL), "testing an already running site");
  setup.setTimeout(15 * 60_000);
  page.setDefaultTimeout(180_000);

  for (const path of [
    "/",
    "/shop",
    "/category/mehndi-baskets",
    "/products/gilded-rose-mehndi-basket",
    "/search?q=brass",
    "/cart",
    "/checkout",
    "/checkout/success?order=EE0&t=x",
    "/kit",
    "/login",
    "/register",
    "/account",
    "/account/orders",
    "/about",
    "/admin-login",
  ]) {
    await page.goto(path, { waitUntil: "load" });
  }

  for (const path of [
    "/api/checkout/quote",
    "/api/checkout/order",
    "/api/checkout/test-payment",
    "/api/account/register",
    "/api/account/login",
  ]) {
    await page.request.post(path, { data: {}, timeout: 180_000 });
  }
  await page.request.get("/api/account/me", { timeout: 180_000 });

  // Admin pages, signed in.
  const email = process.env.ADMIN_EMAIL ?? process.env.ADMIN_DEMO_EMAIL;
  const password = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_DEMO_PASSWORD;
  if (!email || !password) return;
  await page.goto("/admin-login");
  const form = page.getByRole("form", { name: "Admin sign in" });
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password", { exact: true }).fill(password);
  await form.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname === "/admin");
  for (const path of [
    "/admin/orders",
    "/admin/orders/order",
    "/admin/products",
    "/admin/products/new",
    "/admin/products/kit_spoon",
    "/admin/kit-products",
    "/admin/kit-products/new",
    "/admin/kit-products/kit_spoon",
    "/admin/kits",
    "/admin/kits/new",
    "/admin/coupons",
  ]) {
    await page.goto(path, { waitUntil: "load" });
  }
});
