import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const adminEmail = process.env.ADMIN_EMAIL ?? process.env.ADMIN_DEMO_EMAIL ?? "";
const adminPassword = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_DEMO_PASSWORD ?? "";

async function signInAsAdmin(page: Page, next = "/admin") {
  await page.goto(`/admin-login?next=${encodeURIComponent(next)}`);
  const form = page.getByRole("form", { name: "Admin sign in" });
  await form.getByLabel("Email").fill(adminEmail);
  await form.getByLabel("Password", { exact: true }).fill(adminPassword);
  await form.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === next);
}

test.describe("admin sign-in", () => {
  test.skip(({ isMobile }) => isMobile, "admin flows are exercised on desktop");
  test.skip(!adminEmail || !adminPassword, "set ADMIN_EMAIL / ADMIN_PASSWORD in .env.local");

  test("admin pages redirect to sign-in, reject a wrong password, and sign out", async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin-login\?next=%2Fadmin%2Forders$/);

    const form = page.getByRole("form", { name: "Admin sign in" });
    await form.getByLabel("Email").fill(adminEmail);
    await form.getByLabel("Password", { exact: true }).fill("wrong-password");
    await form.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("That email and password don't match.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin-login/);

    await form.getByLabel("Password", { exact: true }).fill(adminPassword);
    await form.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/orders$/);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin-login$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin-login/);
  });

  test("a forged session cookie is rejected", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "ee_admin", value: "YWRtaW5AeC50ZXN0fDk5OTk5OTk5OTk.forged", url: baseURL! }]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin-login/);
  });
});

/** Places and pays for an order through the real checkout API (test payment mode, no Razorpay keys). */
async function placePaidOrder(request: APIRequestContext, name: string, lines: Record<string, unknown>[]) {
  const res = await request.post("/api/checkout/order", {
    data: {
      email: "e2e-orders@example.com",
      phone: "9876543210",
      shipping: {
        fullName: name,
        line1: "12 Residency Road",
        city: "Srinagar",
        state: "Jammu and Kashmir",
        pincode: "190001",
        country: "India",
      },
      shippingMethod: "standard",
      lines,
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const start = (await res.json()) as { orderId: string; token: string; number: string };
  const paid = await request.post("/api/checkout/test-payment", {
    data: { orderId: start.orderId, token: start.token, outcome: "success" },
  });
  expect(paid.ok()).toBeTruthy();
  return start.number;
}

const kitLine = () => ({
  productId: "kit_spoon",
  variantId: "kit-spoon-v2",
  quantity: 100,
  bundle: { id: `bnd_${Date.now()}`, name: "Wazwan kit · 25 trami", summary: "25 trami · Basic" },
});

test.describe("admin", () => {
  test.skip(({ isMobile }) => isMobile, "admin flows are exercised on desktop");
  test.skip(!adminEmail || !adminPassword, "set ADMIN_EMAIL / ADMIN_PASSWORD in .env.local");
  test.beforeEach(async ({ page }) => signInAsAdmin(page));

  test("dashboard shows what needs doing", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("region", { name: "To do" })).toContainText("orders to pack");
  });

  test("product and built kit orders are kept apart, and an order moves through packing to delivery", async ({
    page,
    request,
  }) => {
    const tag = Date.now().toString(36);
    const regular = await placePaidOrder(request, `Rafiq ${tag}`, [{ productId: "p_007", variantId: "ee-bh-dry-v1", quantity: 1 }]);
    await placePaidOrder(request, `Rukhsana ${tag}`, [kitLine()]);
    await placePaidOrder(request, `Bilal ${tag}`, [kitLine(), { productId: "p_007", variantId: "ee-bh-dry-v1", quantity: 1 }]);

    await page.goto("/admin/orders");
    const tabs = page.getByRole("tablist", { name: "Order kind" });
    const table = page.getByRole("table");
    const search = page.getByRole("searchbox", { name: /Search order number/ });
    await search.fill(tag);
    await expect(table.getByText(`Rafiq ${tag}`)).toBeVisible();
    await expect(table.getByText(`Rukhsana ${tag}`)).toBeVisible();

    await tabs.getByRole("tab", { name: /^Built kit orders/ }).click();
    await expect(page).toHaveURL(/kind=built-kit/);
    await search.fill(tag);
    await expect(table.getByText(`Bilal ${tag}`)).toBeVisible();
    await expect(table.getByText(`Rukhsana ${tag}`)).toBeVisible();
    await expect(table.getByText(`Rafiq ${tag}`)).toHaveCount(0);

    await tabs.getByRole("tab", { name: /^Product orders/ }).click();
    await search.fill(tag);
    await expect(table.getByText(`Rafiq ${tag}`)).toBeVisible();
    await expect(table.getByText(`Bilal ${tag}`)).toBeVisible(); // it has a product as well as a kit
    await expect(table.getByText(`Rukhsana ${tag}`)).toHaveCount(0);

    await table.getByRole("link", { name: new RegExp(regular) }).click();
    await expect(page.getByRole("heading", { name: `Order ${regular}` })).toBeVisible();
    // Only the valid next steps are offered.
    await expect(page.getByRole("button", { name: "Mark delivered" })).toHaveCount(0);
    await page.getByRole("button", { name: "Start packing" }).click();
    await expect(page.getByText("Order processing")).toBeVisible();

    await page.getByRole("button", { name: "Mark shipped" }).click();
    await page.getByLabel("Courier").fill("Test Courier");
    await page.getByLabel("Tracking number").fill("TC123");
    await page.getByRole("button", { name: "Confirm shipment" }).click();
    await expect(page.getByText("Test Courier · TC123")).toBeVisible();

    // Saved in the database: still there after a reload.
    await page.reload();
    await expect(page.getByText("Test Courier · TC123")).toBeVisible();
    await page.getByRole("button", { name: "Mark delivered" }).click();
    await expect(page.getByText("Order delivered")).toBeVisible();
  });

  test("product editor validates before saving", async ({ page }) => {
    await page.goto("/admin/products/new");
    await page.getByRole("button", { name: "Create product" }).click();
    await expect(page.getByText("Product name is required")).toBeVisible();
    await expect(page.getByText("Add at least one image")).toBeVisible();
  });

  test("a discount code made in the admin works in the shop", async ({ page }) => {
    const code = `EID${Date.now().toString(36).toUpperCase().slice(-5)}`;
    await page.goto("/admin/coupons");
    await page.getByRole("button", { name: "Create coupon" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Code").fill(code);
    await dialog.getByLabel("Percent %").fill("12");
    await dialog.getByRole("button", { name: "Save coupon" }).click();
    await expect(page.getByRole("cell", { name: code, exact: true }).filter({ visible: true }).first()).toBeVisible();
    await page.reload();
    await expect(page.getByRole("cell", { name: code, exact: true }).filter({ visible: true }).first()).toBeVisible();

    await page.goto("/products/gilded-rose-mehndi-basket");
    await page.getByRole("button", { name: "Medium" }).click();
    await page.getByRole("button", { name: "Add to bag", exact: true }).first().click();
    await page.goto("/cart");
    await page.getByPlaceholder("Discount code").fill(code);
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("Discount", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  });
});

test.describe("admin customer kits", () => {
  test.skip(({ isMobile }) => isMobile, "admin flows are exercised on desktop");
  test.skip(!adminEmail || !adminPassword, "set ADMIN_EMAIL / ADMIN_PASSWORD in .env.local");
  test.beforeEach(async ({ page }) => signInAsAdmin(page, "/admin/kits"));

  test("admin builds a kit for a customer and the link opens that exact kit on another device", async ({ page, browser }) => {
    await expect(page.getByRole("heading", { name: "Customer kits" })).toBeVisible();
    await page.getByRole("link", { name: "Create kit" }).click();
    await expect(page.getByRole("heading", { name: "New customer kit" })).toBeVisible();

    await page.getByLabel("Name", { exact: true }).fill("Test Customer");
    await page.getByLabel("WhatsApp number").fill("9876543210");
    await page.getByLabel("Message to the customer").fill("Carpet box rakha hai, sasta padega.");
    await page
      .getByRole("group", { name: "Function" })
      .getByRole("button", { name: /Walima/ })
      .click();
    await page.getByLabel("Trami").fill("40");
    await page
      .getByRole("group", { name: "Tier" })
      .getByRole("button", { name: /Premium/ })
      .click();
    await page.getByLabel("Take-home box option").selectOption({ label: "Carpet · ₹12" });
    await page.getByLabel("Quantity for Spoon").fill("200");
    await page.getByLabel("Include Knife").uncheck();

    await page.getByRole("button", { name: "Create kit" }).click();
    await expect(page).toHaveURL(/\/admin\/kits\/kit_[a-z0-9]+$/);
    const link = await page.getByLabel("Customer link").inputValue();
    expect(link).toMatch(/\/kit\?k=[A-Za-z0-9_-]+$/);

    // The customer opens the link in their own browser — nothing shared but the URL.
    const customer = await browser.newPage();
    await customer.goto(link);
    const chat = customer.getByRole("log", { name: "Conversation" });
    await expect(chat.getByText("Test Customer ji, yeh kit humne aapke liye khud tayyar kiya hai.")).toBeVisible();
    await expect(chat.getByText("Carpet box rakha hai, sasta padega.")).toBeVisible();
    const panel = customer.locator('section[aria-labelledby="kit-title"]');
    await expect(panel.getByText("Walima · 40 trami")).toBeVisible();
    await expect(panel.getByRole("button", { name: /^Take-home box / })).toContainText("Carpet ·");
    await expect(panel.getByRole("button", { name: /^Spoon / })).toContainText("200 pcs");
    await expect(panel.getByRole("button", { name: "Add back Knife" })).toBeVisible();
    await customer.close();

    await page.getByRole("link", { name: "Kits for customers" }).click();
    await expect(page.getByRole("link", { name: /^Test Customer/ })).toBeVisible();
  });
});

test.describe("admin catalogue: products and kit products are separate", () => {
  test.skip(({ isMobile }) => isMobile, "admin flows are exercised on desktop");
  test.skip(!adminEmail || !adminPassword, "set ADMIN_EMAIL / ADMIN_PASSWORD in .env.local");
  test.beforeEach(async ({ page }) => signInAsAdmin(page, "/admin/products"));

  test("kit items stay out of Products, and a new kit product can be added on its own", async ({ page }) => {
    // Everyday products only.
    await page.getByRole("searchbox", { name: "Search name or SKU" }).fill("Spoon");
    await expect(page.getByText("No results for “Spoon”.")).toBeVisible();
    await page.goto("/admin/products/kit_spoon");
    await expect(page.getByRole("heading", { name: "This is a kit product" })).toBeVisible();
    await page.getByRole("link", { name: "Edit in Kit products" }).click();
    await expect(page).toHaveURL(/\/admin\/kit-products\/kit_spoon$/);
    await expect(page.getByLabel("Needed per trami")).toHaveValue("4");

    // Add a kit product with its own fields.
    await page.goto("/admin/kit-products");
    await expect(page.getByRole("heading", { name: "Kit products" })).toBeVisible();
    await page.getByRole("link", { name: "Add kit product" }).click();
    await page.getByRole("button", { name: "Add kit product" }).click();
    await expect(page.getByText("Give the item a name.")).toBeVisible();

    await page.getByLabel("Name", { exact: true }).fill("Kahwa flask");
    await page.getByLabel("Kit section", { exact: true }).selectOption("drinking");
    await page.getByLabel("Needed per trami").fill("0.25");
    await page.getByRole("button", { name: "All functions" }).click();
    // Mehndi only, so the storefront kit tests running alongside (Wazwan, Walima, Nikkah) aren't affected.
    await page.getByRole("button", { name: /^Mehndi raat/ }).click();
    await page.getByLabel("Choice label").fill("Size");
    await page.getByLabel("Option 1 name").fill("1 litre");
    await page.getByLabel("Option 1 price in rupees").fill("250");
    await page.getByRole("button", { name: "Add option" }).click();
    await page.getByLabel("Option 2 name").fill("2 litre");
    await page.getByLabel("Option 2 price in rupees").fill("400");
    // Preview: 50 trami × 0.25 → 13. Basic takes the first option; Standard (second) and Premium (last) both take "2 litre".
    await expect(page.getByText("1 litre · 13 pcs")).toHaveCount(1);
    await expect(page.getByText("2 litre · 13 pcs")).toHaveCount(2);

    // Two photos for the "2 litre" option, straight from its "Add photos" button.
    await page.getByLabel("Upload photos for option 2 (2 litre)", { exact: true }).setInputFiles([
      { name: "kahwa-flask-2l.png", mimeType: "image/png", buffer: tinyPng },
      { name: "kahwa-flask-2l-open.png", mimeType: "image/png", buffer: tinyPng },
    ]);
    const manage = page.getByRole("button", { name: /^Photos for option 2 \(2 litre\): 2 photos/ });
    await expect(manage).toBeVisible();
    await manage.click();
    const photos = page.getByRole("dialog", { name: "Photos for option 2 (2 litre)" });
    await expect(photos.getByLabel(/^Alt text for photo/)).toHaveCount(2);
    // Uploads finish in any order; moving the second photo first swaps them.
    const second = await photos.getByLabel("Alt text for photo 2").inputValue();
    expect(second).toMatch(/^Kahwa flask 2l/);
    await photos.getByRole("button", { name: "Move photo 2 earlier" }).click();
    await expect(photos.getByLabel("Alt text for photo 1")).toHaveValue(second);
    await page.keyboard.press("Escape");

    // Photos of the item itself, in the Photos panel.
    await page.getByLabel("Upload images").first().setInputFiles({ name: "kahwa-flask.png", mimeType: "image/png", buffer: tinyPng });
    await expect(page.getByText("1 of 8 photos")).toBeVisible();

    await page.getByRole("button", { name: "Add kit product" }).click();
    await expect(page).toHaveURL(/\/admin\/kit-products\/kit_kahwa-flask$/);
    await page.reload();
    await expect(page.getByRole("button", { name: /^Photos for option 2 \(2 litre\): 2 photos/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add photos of this option" })).toHaveCount(1); // option 1 has none
    await expect(page.getByText("1 of 8 photos")).toBeVisible();
    await page.getByRole("link", { name: "Kit products" }).first().click();
    await expect(page.getByRole("link", { name: /^Kahwa flask/ })).toBeVisible();

    // It never shows up among everyday products.
    await page.goto("/admin/products");
    await page.getByRole("searchbox", { name: "Search name or SKU" }).fill("Kahwa");
    await expect(page.getByText("No results for “Kahwa”.")).toBeVisible();
  });
});

/** A real 1×1 PNG, so the browser can decode it and read its size. */
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

test.describe("admin image uploads", () => {
  test.skip(({ isMobile }) => isMobile, "admin flows are exercised on desktop");
  test.skip(!adminEmail || !adminPassword, "set ADMIN_EMAIL / ADMIN_PASSWORD in .env.local");

  test("the upload API refuses anyone who isn't signed in", async ({ request }) => {
    const res = await request.post("/api/admin/uploads", { data: { contentType: "image/png", size: 100, folder: "products" } });
    expect(res.status()).toBe(401);
  });

  test("staff upload product photos; non-images are rejected with a reason", async ({ page, request }) => {
    await signInAsAdmin(page, "/admin/products/new");

    await page.getByLabel("Upload images").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expect(page.getByText("notes.txt isn't a JPG, PNG, WebP or AVIF image.")).toBeVisible();

    await page.getByLabel("Upload images").setInputFiles({ name: "rose-basket_front.png", mimeType: "image/png", buffer: tinyPng });
    // Alt text starts from the file name; the main-image slot appears once uploaded.
    const alt = page.getByLabel("Alt text · main image");
    await expect(alt).toHaveValue("Rose basket front");
    const src = await page.locator('img[src*="uploads%2Fproducts"], img[src*="/uploads/products/"]').first().getAttribute("src");
    expect(src).toBeTruthy();
    const uploaded = decodeURIComponent(src!).match(/\/uploads\/products\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.png/)?.[0];
    expect(uploaded).toBeTruthy();
    expect((await request.get(uploaded!)).status()).toBe(200);
  });
});

test.describe("admin product variants", () => {
  test.skip(({ isMobile }) => isMobile, "admin flows are exercised on desktop");
  test.skip(!adminEmail || !adminPassword, "set ADMIN_EMAIL / ADMIN_PASSWORD in .env.local");

  test("variants are added as values, each with its own price and stock, and the shop offers them", async ({ page }) => {
    const tag = Date.now().toString(36);
    await signInAsAdmin(page, "/admin/products/new");
    await page.getByLabel("Product name").fill(`Velvet tray ${tag}`);
    // The web address is made from the name as it's typed.
    await expect(page.getByText(`/products/velvet-tray-${tag}`)).toBeVisible();
    await page.getByLabel("Short description").fill("A velvet-lined serving tray.");
    await page.getByLabel("Full description").fill("Velvet-lined tray for serving sweets at the mehndi.");
    await page.getByLabel("Category").selectOption("wedding-essentials");
    await page.getByLabel("Status").selectOption("active");
    await page.getByLabel("Upload images").setInputFiles({ name: "velvet-tray.png", mimeType: "image/png", buffer: tinyPng });
    await expect(page.getByLabel("Alt text · main image")).toHaveValue("Velvet tray");

    // One version to start with: a single price and stock.
    await expect(page.getByRole("button", { name: /^One version/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Selling price for Default", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /^Different options/ }).click();
    await page.getByRole("button", { name: "Size", exact: true }).click();
    const values = page.getByLabel("Size choices");
    await values.fill("Small");
    await values.press("Enter");
    // The single row becomes Small; more choices add rows.
    await expect(page.getByLabel("Selling price for Small", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Selling price for Default", { exact: true })).toHaveCount(0);
    await values.fill("Medium, Large");
    await values.press("Enter");
    await expect(page.getByLabel(/^Selling price for (Small|Medium|Large)$/)).toHaveCount(3);
    // "Set for all versions", then one row of its own.
    await page.getByLabel("Selling price for all versions").fill("1.50");
    await page.getByRole("button", { name: "Apply to all" }).click();
    await expect(page.getByLabel("Selling price for Large", { exact: true })).toHaveValue("1.50");
    await page.getByLabel("Selling price for Large", { exact: true }).fill("4");
    await page.getByLabel("Stock for Small").fill("10");
    await page.getByLabel("Stock for Medium").fill("5");

    // Removing a row stops selling that size.
    await page.getByLabel("Stock for Large").fill("3");
    await page.getByRole("button", { name: "Stop selling Medium" }).click();
    await expect(page.getByLabel(/^Selling price for (Small|Medium|Large)$/)).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Remove Medium" })).toHaveCount(0);

    await page.getByRole("button", { name: "Create product" }).click();
    await expect(page).toHaveURL(/\/admin\/products\/p_/);
    await page.reload();
    await expect(page.getByLabel("Selling price for Large", { exact: true })).toHaveValue("4");
    await expect(page.getByLabel("Stock for Small")).toHaveValue("10");
    // Each row got a readable SKU from the product name and its value (shown on request).
    await page.getByLabel("Show SKU codes").check();
    await expect(page.getByLabel("SKU for Small")).toHaveValue(`VELVET-TRAY-${tag}-SMALL`.toUpperCase());
    await expect(page.getByLabel("SKU for Large")).toHaveValue(`VELVET-TRAY-${tag}-LARGE`.toUpperCase());

    await page.goto(`/products/velvet-tray-${tag}`);
    await expect(page.getByRole("heading", { level: 1, name: `Velvet tray ${tag}` })).toBeVisible();
    await page.getByRole("button", { name: "Large" }).click();
    await expect(page.getByText("₹4").first()).toBeVisible();
    await page.getByRole("button", { name: "Small" }).click();
    await expect(page.getByText("₹1.50").first()).toBeVisible();
  });
});

test.describe("admin reviews", () => {
  test.skip(({ isMobile }) => isMobile, "admin flows are exercised on desktop");
  test.skip(!adminEmail || !adminPassword, "set ADMIN_EMAIL / ADMIN_PASSWORD in .env.local");

  test("a review added in the admin shows on the home page, can be edited, and hidden again", async ({ page }) => {
    const name = `Rubina ${Date.now().toString(36)}`;
    const reviews = page.getByRole("region", { name: "From our customers" });
    await signInAsAdmin(page, "/admin/testimonials");
    await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible();

    await page.getByRole("button", { name: "Add review" }).first().click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Customer name").fill(name);
    await sheet.getByLabel("Review").fill("The mehndi baskets were even prettier in person.");
    await sheet.getByLabel("Product").fill("Gilded Rose Mehndi Basket");
    await sheet.getByRole("button", { name: "Add review" }).click();
    await expect(page.getByText("It's on the home page now.")).toBeVisible();

    await page.goto("/");
    await expect(reviews.getByText("The mehndi baskets were even prettier in person.")).toBeVisible();
    await expect(reviews.getByText(name)).toBeVisible();

    // Edit: fix the wording.
    await page.goto("/admin/testimonials");
    await page.getByRole("button", { name: `Edit review by ${name}` }).click();
    await expect(sheet.getByLabel("Customer name")).toHaveValue(name);
    await sheet.getByLabel("Review").fill("The mehndi baskets were even prettier in person. Thank you!");
    await sheet.getByLabel("Rating").selectOption("4");
    await sheet.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Review saved")).toBeVisible();

    await page.goto("/");
    await expect(reviews.getByText("The mehndi baskets were even prettier in person. Thank you!")).toBeVisible();

    // Hide it: gone from the home page.
    await page.goto("/admin/testimonials");
    const card = page.getByRole("listitem").filter({ hasText: name });
    await card.getByRole("switch", { name: "Show on home page" }).click();
    await expect(card.getByText("Hidden")).toBeVisible();
    await page.goto("/");
    await expect(page.getByText("The mehndi baskets were even prettier in person. Thank you!")).toHaveCount(0);
  });
});

test.describe("admin kits: added items", () => {
  test.skip(({ isMobile }) => isMobile, "admin flows are exercised on desktop");
  test.skip(!adminEmail || !adminPassword, "set ADMIN_EMAIL / ADMIN_PASSWORD in .env.local");

  test("the shop adds another type and an extra item to a customer's kit, and the customer's link has them", async ({ page, browser }) => {
    await signInAsAdmin(page, "/admin/kits/new");
    await page.getByLabel("Name", { exact: true }).fill("Added Items Customer");

    // Wooden spoons as well as the suggested plastic ones, and potli (not part of a Wazwan kit).
    await page.getByRole("button", { name: "Add items" }).click();
    const picker = page.getByRole("dialog", { name: "Add items" });
    await picker.getByRole("searchbox", { name: "Search items" }).fill("spoon");
    await picker
      .getByRole("button", { name: /^Spoon / })
      .first()
      .click();
    await picker.getByRole("button", { name: "Add Spoon Wooden small" }).click();
    await expect(page.getByText("Spoon · Wooden small added")).toBeVisible();
    await page.getByRole("button", { name: "Add items" }).click();
    await picker.getByRole("searchbox", { name: "Search items" }).fill("potli");
    await picker.getByRole("button", { name: "Add Potli Special" }).click();

    await page.getByLabel("Quantity for Spoon Wooden small").fill("40");
    await expect(page.getByRole("row").filter({ hasText: "Added" })).toHaveCount(2);

    await page.getByRole("button", { name: "Create kit" }).click();
    await expect(page).toHaveURL(/\/admin\/kits\/kit_[a-z0-9]+$/);
    const link = await page.getByLabel("Customer link").inputValue();

    const customer = await browser.newPage();
    await customer.goto(link);
    const panel = customer.locator('section[aria-labelledby="kit-title"]');
    await expect(panel.getByRole("button", { name: /^Spoon .*Wooden small 40/ })).toBeVisible();
    await expect(panel.getByRole("button", { name: /^Potli Added Special/ })).toBeVisible();
    await customer.close();
  });
});
