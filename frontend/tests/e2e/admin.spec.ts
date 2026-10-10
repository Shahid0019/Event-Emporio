import { expect, test } from "@playwright/test";

test.describe("admin (demo mode)", () => {
  test.skip(({ isMobile }) => isMobile, "admin flows are exercised on desktop");

  test("dashboard figures come from order data", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText(/figures computed from \d+ demo orders/)).toBeVisible();
    await expect(page.getByRole("img", { name: /Daily revenue for the last 30 days/ })).toBeVisible();
  });

  test("admin moves an order through valid fulfilment states", async ({ page }) => {
    await page.goto("/admin/orders");
    await page.getByRole("group", { name: "Filter orders" }).getByRole("button", { name: /^Open/ }).click();
    const row = page.getByRole("row").filter({ hasText: "Confirmed" }).first();
    await row.getByRole("link").click();
    await expect(page.getByRole("heading", { name: /^Order EE/ })).toBeVisible();

    // Only valid next steps are offered: no "Mark delivered" from confirmed.
    await expect(page.getByRole("button", { name: "Mark delivered" })).toHaveCount(0);
    await page.getByRole("button", { name: "Mark processing" }).click();
    await expect(page.getByText("Order marked processing")).toBeVisible();

    await page.getByRole("button", { name: "Mark shipped" }).click();
    await page.getByLabel("Courier").fill("Test Courier");
    await page.getByLabel("Tracking number").fill("TC123");
    await page.getByRole("button", { name: "Confirm shipment" }).click();
    await expect(page.getByText("Test Courier · TC123")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark delivered" })).toBeVisible();
  });

  test("product editor validates before saving", async ({ page }) => {
    await page.goto("/admin/products/new");
    await page.getByRole("button", { name: "Create product" }).click();
    await expect(page.getByText("Product name is required")).toBeVisible();
    await expect(page.getByText("Add at least one image")).toBeVisible();
  });

  test("coupon can be created and appears in the list", async ({ page }) => {
    await page.goto("/admin/coupons");
    await page.getByRole("button", { name: "Create coupon" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Code").fill("EIDGIFT");
    await dialog.getByLabel("Percent %").fill("12");
    await dialog.getByRole("button", { name: "Save coupon" }).click();
    await expect(page.getByRole("cell", { name: "EIDGIFT", exact: true }).filter({ visible: true }).first()).toBeVisible();
  });
});
