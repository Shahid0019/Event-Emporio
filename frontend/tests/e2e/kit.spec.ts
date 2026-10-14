import { expect, test, type Locator, type Page } from "@playwright/test";
import { buildKit, kitTotal, NO_PREFS } from "../../src/lib/kit/buildKit";
import { formatKitAmount } from "../../src/lib/kit/format";

/** The live kit: the right-hand column on desktop, the bottom sheet on mobile. */
async function kitPanel(page: Page, isMobile: boolean): Promise<Locator> {
  if (!isMobile) return page.locator('section[aria-labelledby="kit-title"]');
  await page.getByRole("button", { name: /View kit/ }).click();
  return page.getByRole("dialog", { name: "Aapka kit" });
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The collapsed item row: "Spoon  Plastic medium · 200 pcs  ₹300 …" — tap to open it. */
const row = (panel: Locator, item: string) => panel.getByRole("button", { name: new RegExp(`^${escape(item)} `) });
async function openRow(panel: Locator, item: string) {
  const r = row(panel, item);
  if ((await r.getAttribute("aria-expanded")) !== "true") await r.click();
}
async function pickVariant(panel: Locator, item: string, variant: string) {
  await openRow(panel, item);
  await panel
    .getByRole("group", { name: new RegExp(`^${escape(item)} (type|size|roll)$`) })
    .getByRole("button", { name: new RegExp(`^${escape(variant)} ₹`) })
    .click();
}
const footerTotal = (panel: Locator) => panel.locator("div.sticky p").first();
const chat = (page: Page) => page.getByRole("log", { name: "Conversation" });

test.describe("build my kit", () => {
  test.beforeEach(({ isMobile }) => test.skip(isMobile, "Desktop layout; the mobile sheet has its own test"));

  test("home occasion card opens the kit asking for trami, and the stepper updates the kit live", async ({ page }) => {
    await page.goto("/");
    await page
      .locator('section[aria-labelledby="occasions-title"]')
      .getByRole("link", { name: /Wazwan/ })
      .click();
    await expect(page).toHaveURL(/\/kit\?occasion=wazwan$/);
    await expect(chat(page).getByText("Kitne trami lagenge?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Change answer: Wazwan" })).toBeVisible();

    const panel = await kitPanel(page, false);
    await expect(row(panel, "Spoon")).toContainText("200 pcs");
    await page.getByRole("button", { name: "5 trami zyada" }).click();
    await expect(row(panel, "Spoon")).toContainText("220 pcs");
    await expect(page.getByText("≈ 220 mehmaan")).toBeVisible();
  });

  test("full chat: tiers, premium, bio, and re-answering an earlier step", async ({ page }) => {
    await page.goto("/kit?occasion=walima");
    await page.getByRole("button", { name: "Haan, 50 trami" }).click();
    await page.getByRole("button", { name: "2 hafte mein" }).click();

    // Tier cards show the engine's totals for the current answers.
    for (const tier of ["basic", "standard", "premium"] as const) {
      const total = kitTotal(buildKit({ occasion: "walima", trami: 50, tier, prefs: NO_PREFS }));
      await expect(page.getByRole("button", { name: new RegExp(`^${tier}`, "i") })).toContainText(formatKitAmount(total));
    }
    await page.getByRole("button", { name: /^Premium/ }).click();
    const panel = await kitPanel(page, false);
    await expect(row(panel, "Dastarkhan")).toContainText("Extra large ·");
    await expect(row(panel, "Water glass")).toContainText("Special shake ·");

    await page.getByRole("button", { name: "Bio / eco items" }).click();
    await expect(page.getByRole("button", { name: "Bio / eco items" })).toHaveAttribute("aria-pressed", "true");
    for (const item of ["Salad plate", "Gostab bowl", "Cake plate"]) {
      await expect(row(panel, item)).toContainText("Bio ·");
    }
    await page.getByRole("button", { name: "Mera kit dikhaiye" }).click();
    await expect(chat(page).getByText(/Aapka kit tayyar hai: 18 cheezein/)).toBeVisible();

    // Re-open the trami answer, change it, and land back on the done step.
    await page.getByRole("button", { name: "Change answer: 50 trami" }).click();
    await page.getByRole("button", { name: "5 trami zyada" }).click();
    await page.getByRole("button", { name: "Haan, 55 trami" }).click();
    await expect(page.getByRole("button", { name: "Change answer: 55 trami" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Share on WhatsApp" }).or(page.getByRole("link", { name: "Share on WhatsApp" })),
    ).toBeVisible();
    await expect(row(panel, "Spoon")).toContainText("220 pcs");
    await expect(page).toHaveURL(/occasion=walima&trami=55&tier=premium&prefs=bio/);
  });

  test("going over budget suggests swaps that lower the total", async ({ page }) => {
    await page.goto("/kit?ready=50-standard");
    const panel = await kitPanel(page, false);
    await expect(panel.getByText("Within your Standard budget")).toBeVisible();
    await pickVariant(panel, "Take-home box", "Steel basket");
    await pickVariant(panel, "Dastarkhan", "Extra large");
    await expect(panel.getByText(/Budget se ₹[\d,]+ upar hai/)).toBeVisible();
    await expect(panel.getByText("Over your Standard budget")).toBeVisible();

    const before = Number((await footerTotal(panel).textContent())?.replace(/\D/g, ""));
    await panel.getByRole("button", { name: /^Switch Take-home box to Carpet/ }).click();
    await expect.poll(async () => Number((await footerTotal(panel).textContent())?.replace(/\D/g, ""))).toBeLessThan(before);
  });

  test("remove → tray → add back", async ({ page }) => {
    await page.goto("/kit?ready=25-basic");
    const panel = await kitPanel(page, false);
    await openRow(panel, "Knife");
    await panel.getByRole("button", { name: "Remove Knife" }).click();
    await expect(row(panel, "Knife")).toHaveCount(0);
    await panel.getByRole("button", { name: "Add back Knife" }).click();
    await expect(row(panel, "Knife")).toContainText("25 pcs");
  });

  test("add all to cart merges into the existing cart and checks out", async ({ page }) => {
    await page.goto("/kit?ready=25-basic");
    const panel = await kitPanel(page, false);
    await panel.getByRole("button", { name: "Add all to cart" }).click();
    await expect(panel.getByRole("link", { name: "✓ In cart · View cart" })).toBeVisible();
    await expect(panel.getByRole("status").filter({ hasText: "Kit added to cart." })).toHaveCount(1);
    await expect(chat(page).getByText("Shukriya! Saara saamaan cart mein daal diya.")).toBeVisible();

    // Editing the kit turns the button back into "Add all to cart"; adding again merges quantities.
    await openRow(panel, "Spoon");
    await panel.getByRole("group", { name: "Quantity for Spoon" }).getByRole("button", { name: "Increase quantity" }).click();
    await expect(row(panel, "Spoon")).toContainText("110 pcs");
    await panel.getByRole("button", { name: "Reset to 100" }).click();
    await expect(row(panel, "Spoon")).toContainText("100 pcs");
    await panel.getByRole("group", { name: "Quantity for Spoon" }).getByRole("button", { name: "Increase quantity" }).click();
    await panel.getByRole("button", { name: "Add all to cart" }).click();

    await panel.getByRole("link", { name: "✓ In cart · View cart" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    const main = page.getByRole("main");
    await expect(main.getByRole("group", { name: "Quantity for Spoon" }).locator("output")).toHaveText("210"); // 100 + 110
    await expect(main.getByRole("group", { name: "Quantity for Dastarkhan" }).locator("output")).toHaveText("50");

    await page.goto("/checkout");
    const form = page.getByRole("form", { name: "Checkout" });
    await form.getByLabel("Email", { exact: true }).fill("guest@example.com");
    await form.getByLabel("Mobile number").fill("9876543210");
    await form.getByLabel("Full name").fill("Test Guest");
    await form.getByLabel("Address line 1").fill("12 Residency Road");
    await form.getByLabel("City").fill("Srinagar");
    await form.getByLabel("PIN code").fill("190001");
    await form.getByLabel("State / UT").selectOption("Jammu and Kashmir");
    const pay = page.getByRole("button", { name: /^Pay ₹/ });
    await expect(pay).toBeEnabled();
    await pay.click();
    await page.getByRole("button", { name: "Simulate successful payment" }).click();
    await expect(page).toHaveURL(/\/checkout\/success\?order=EE/);
  });

  test("ready kit link, refresh and share link all reopen the same kit", async ({ page, browser }) => {
    await page.goto("/kit?ready=100-premium");
    await expect(page).toHaveURL(/\/kit\?occasion=wazwan&trami=100&tier=premium$/);
    await expect(chat(page).getByText(/Aapka kit tayyar hai: 16 cheezein/)).toBeVisible();
    const panel = await kitPanel(page, false);
    await pickVariant(panel, "Napkin", "Printed");

    await page.reload();
    await expect(row(panel, "Napkin")).toContainText("Printed ·");
    await expect(row(panel, "Spoon")).toContainText("400 pcs");

    const share = await page.getByRole("link", { name: "Share on WhatsApp" }).getAttribute("href");
    const text = decodeURIComponent(new URL(share!).searchParams.get("text")!);
    expect(text).toContain("/kit?occasion=wazwan&trami=100&tier=premium");

    // A fresh browser opening the shared link gets the same answers.
    const other = await browser.newPage();
    await other.goto(`/kit?occasion=wazwan&trami=100&tier=premium`);
    await expect(other.getByRole("button", { name: "Change answer: Premium" })).toBeVisible();
    await expect(row(other.locator('section[aria-labelledby="kit-title"]'), "Spoon")).toContainText("400 pcs");
    await other.close();
  });
});

test("mobile: sticky kit bar expands into the full kit sheet", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile only");
  await page.goto("/kit?ready=50-standard");
  const bar = page.getByRole("button", { name: /16 items · ₹[\d,]+ · View kit|View kit/ });
  await expect(bar).toBeVisible();
  await expect(bar).toContainText("16 items");
  const sheet = await kitPanel(page, true);
  await expect(sheet.getByText("Wazwan · 50 trami · Abhi tay nahi · Standard")).toBeVisible();
  await expect(row(sheet, "Spoon")).toContainText("200 pcs");
  await pickVariant(sheet, "Water glass", "Crystal");
  await expect(row(sheet, "Water glass")).toContainText("Crystal ·");
  await expect(sheet.getByRole("button", { name: "Add all to cart" })).toBeVisible();
});

test("the chat can be minimised and reopened, and the choice survives a refresh", async ({ page, isMobile }) => {
  await page.goto("/kit");
  await page.evaluate(() => localStorage.removeItem("ee.kit.v1"));
  await page.goto("/kit");
  // Nothing to look at yet, so the chat can't be minimised before an occasion is chosen.
  await expect(page.getByRole("list", { name: "How it works" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Minimise chat" })).toHaveCount(0);

  await page.goto("/kit?ready=50-standard");
  await page.getByRole("button", { name: "Minimise chat" }).click();
  const launcher = page.getByRole("button", { name: /^Open chat\. Kit tayyar/ });
  await expect(launcher).toBeFocused();
  await expect(page.getByRole("log", { name: "Conversation" })).toHaveCount(0);
  // With the chat minimised the kit is shown in the page itself, on phones too.
  const panel = page.locator('section[aria-labelledby="kit-title"]');
  await expect(panel.getByRole("button", { name: "Add all to cart" })).toBeVisible();
  if (isMobile) await expect(page.getByRole("button", { name: /View kit/ })).toHaveCount(0);

  await page.reload();
  await expect(launcher).toBeVisible();
  await launcher.click();
  await expect(page.getByRole("log", { name: "Conversation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Minimise chat" })).toBeFocused();
});
