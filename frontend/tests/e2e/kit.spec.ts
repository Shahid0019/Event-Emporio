import { expect, test, type Locator, type Page } from "@playwright/test";
import { buildKit, kitTotal, NO_PREFS } from "../../src/lib/kit/buildKit";
import { formatKitAmount } from "../../src/lib/kit/format";

/** The live kit: the right-hand column on desktop, the bottom sheet on mobile. */
async function kitPanel(page: Page, isMobile: boolean): Promise<Locator> {
  if (!isMobile) return page.locator('section[aria-labelledby="kit-title"]');
  await page.getByRole("button", { name: /View kit/ }).click();
  return page.getByRole("dialog", { name: "Your kit" });
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The collapsed item row: "Spoon  Plastic medium · 200 pcs  ₹300 …" — tap to open it. */
const row = (panel: Locator, item: string) => panel.getByRole("button", { name: new RegExp(`^${escape(item)} `) });
async function openRow(panel: Locator, item: string) {
  const r = row(panel, item);
  if ((await r.getAttribute("aria-expanded")) === "true") return;
  // Click the price/arrow side: the picture and name open the item's details instead.
  const box = await r.boundingBox();
  await r.click(box ? { position: { x: box.width - 16, y: box.height / 2 } } : undefined);
}
async function pickVariant(panel: Locator, item: string, variant: string) {
  await openRow(panel, item);
  await panel
    .getByRole("group", { name: new RegExp(`^${escape(item)} (type|size|roll)$`) })
    .getByRole("button", { name: `Switch to ${variant}`, exact: true })
    .click();
}
const footerTotal = (panel: Locator) => panel.locator("div.sticky p").first();
/** Opens the chat if it's tucked away (finished kits open with the kit in front). */
async function openChat(page: Page) {
  const launcher = page.getByRole("button", { name: /^Open chat\./ });
  if (await launcher.isVisible()) await launcher.click();
}
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
    await expect(chat(page).getByText("How many guests are you expecting?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Change answer: Wazwan" })).toBeVisible();

    const panel = await kitPanel(page, false);
    await expect(row(panel, "Spoon")).toContainText("200 pcs");
    // ± changes the trami by exactly one; the number can also be typed.
    await page.getByRole("button", { name: "1 more trami" }).click();
    await expect(row(panel, "Spoon")).toContainText("204 pcs");
    await expect(page.getByText("≈ 204 guests")).toBeVisible();
    await page.getByRole("textbox", { name: "Trami" }).fill("55");
    await expect(row(panel, "Spoon")).toContainText("220 pcs");
    await expect(page.getByText("≈ 220 guests")).toBeVisible();
  });

  test("full chat: tiers, premium, bio, and re-answering an earlier step", async ({ page }) => {
    await page.goto("/kit?occasion=walima");
    await page.getByRole("button", { name: "Yes, 50 trami" }).click();
    await page.getByRole("button", { name: "In 2 weeks" }).click();

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
    await page.getByRole("button", { name: "Show my kit" }).click();
    await expect(chat(page).getByText(/Your kit is ready: 18 items/)).toBeVisible();
    // With every question answered, the chat tucks itself away and the kit takes over.
    await expect(page.getByRole("button", { name: /^Open chat\. Kit ready/ })).toBeVisible();
    await expect(chat(page)).toHaveCount(0);

    // Re-open the chat and the trami answer, change it, and land back on the done step.
    await openChat(page);
    await page.getByRole("button", { name: "Change answer: 50 trami" }).click();
    await page.getByRole("textbox", { name: "Trami" }).fill("55");
    await page.getByRole("button", { name: "Yes, 55 trami" }).click();
    await expect(page.getByRole("button", { name: "Change answer: 55 trami" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Share on WhatsApp" }).or(page.getByRole("link", { name: "Share on WhatsApp" })),
    ).toBeVisible();
    await expect(row(panel, "Spoon")).toContainText("220 pcs");
    await expect(page).toHaveURL(/occasion=walima&trami=55&tier=premium&prefs=bio/);
  });

  test("going over budget suggests swaps that lower the total", async ({ page }) => {
    await page.goto("/kit?occasion=wazwan&trami=50&tier=standard");
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
    await page.goto("/kit?occasion=wazwan&trami=25&tier=basic");
    const panel = await kitPanel(page, false);
    await openRow(panel, "Knife");
    await panel.getByRole("button", { name: "Remove Knife" }).click();
    await expect(row(panel, "Knife")).toHaveCount(0);
    await panel.getByRole("button", { name: "Add back Knife" }).click();
    await expect(row(panel, "Knife")).toContainText("25 pcs");
  });

  test("the kit goes in the bag as one item, and Edit kit updates that same item", async ({ page }) => {
    await page.goto("/cart");
    await page.evaluate(() => localStorage.removeItem("ee.cart.v1"));
    await page.goto("/kit?occasion=wazwan&trami=25&tier=basic");
    const panel = await kitPanel(page, false);
    await panel.getByRole("button", { name: "Add kit to bag" }).click();
    await expect(panel.getByRole("link", { name: "✓ Kit in bag · View bag" })).toBeVisible();
    await expect(panel.getByRole("status").filter({ hasText: "Kit added to your bag." })).toHaveCount(1);
    await openChat(page);
    await expect(chat(page).getByText("Thank you! Everything is in your bag.")).toBeVisible();

    // Editing turns the button into "Update kit in bag" — it replaces the kit, never adds a second.
    await openRow(panel, "Spoon");
    const spoonQty = panel.getByRole("group", { name: "Quantity for Spoon" });
    await spoonQty.getByRole("button", { name: "Increase quantity" }).click();
    await expect(row(panel, "Spoon")).toContainText("101 pcs"); // one at a time
    await panel.getByRole("button", { name: "Reset to 100" }).click();
    await expect(row(panel, "Spoon")).toContainText("100 pcs");
    await spoonQty.getByRole("textbox").fill("110"); // or typed
    await panel.getByRole("button", { name: "Update kit in bag" }).click();

    await panel.getByRole("link", { name: "✓ Kit in bag · View bag" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    const bag = page.getByRole("region", { name: "Items in your bag" });
    await expect(bag.getByText("Wazwan kit · 25 trami")).toHaveCount(1);
    await expect(bag.getByText("1 item", { exact: true })).toBeVisible();
    await bag.getByText("View 16 items").click();
    await expect(bag.getByText(/^Spoon · Plastic small × 110$/)).toBeVisible();

    // Edit kit from the bag reopens exactly this kit; saving updates it in place.
    await bag.getByRole("link", { name: "Edit kit" }).click();
    await expect(page).toHaveURL(/\/kit\?/);
    const editPanel = await kitPanel(page, false);
    await expect(row(editPanel, "Spoon")).toContainText("110 pcs");
    await pickVariant(editPanel, "Dastarkhan", "Medium");
    await editPanel.getByRole("button", { name: "Update kit in bag" }).click();
    await page.goto("/cart");
    await expect(bag.getByText("Wazwan kit · 25 trami")).toHaveCount(1);
    await bag.getByText("View 16 items").click();
    await expect(bag.getByText(/^Dastarkhan · Medium × 25$/)).toBeVisible();

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

  test("kit link, refresh and share link all reopen the same kit", async ({ page, browser }) => {
    await page.goto("/kit?occasion=wazwan&trami=100&tier=premium");
    await expect(chat(page).getByText(/Your kit is ready: 16 items/)).toBeVisible();
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
  await page.goto("/kit?occasion=wazwan&trami=50&tier=standard");
  // With the chat open, the kit moves to the bottom bar.
  await openChat(page);
  const bar = page.getByRole("button", { name: /View kit/ });
  await expect(bar).toBeVisible();
  await expect(bar).toContainText("16 items");
  const sheet = await kitPanel(page, true);
  await expect(sheet.getByText("Wazwan · 50 trami · Not decided yet · Standard")).toBeVisible();
  await expect(row(sheet, "Spoon")).toContainText("200 pcs");
  await pickVariant(sheet, "Water glass", "Crystal");
  await expect(row(sheet, "Water glass")).toContainText("Crystal ·");
  await expect(sheet.getByRole("button", { name: "Add kit to bag" })).toBeVisible();
});

test("the chat can be minimised and reopened, and the choice survives a refresh", async ({ page, isMobile }) => {
  await page.goto("/kit");
  await page.evaluate(() => localStorage.removeItem("ee.kit.v1"));
  await page.goto("/kit");
  // Nothing to look at yet, so the chat can't be minimised before an occasion is chosen.
  await expect(page.getByRole("list", { name: "How it works" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Minimise chat" })).toHaveCount(0);

  await page.goto("/kit?occasion=wazwan");
  await page.getByRole("button", { name: "Minimise chat" }).click();
  const launcher = page.getByRole("button", { name: /^Open chat\. Question 2/ });
  await expect(launcher).toBeFocused();
  await expect(page.getByRole("log", { name: "Conversation" })).toHaveCount(0);
  // With the chat minimised the kit is shown in the page itself, on phones too.
  const panel = page.locator('section[aria-labelledby="kit-title"]');
  await expect(panel.getByRole("button", { name: "Add kit to bag" })).toBeVisible();
  if (isMobile) await expect(page.getByRole("button", { name: /View kit/ })).toHaveCount(0);

  await page.reload();
  await expect(launcher).toBeVisible();
  await launcher.click();
  await expect(page.getByRole("log", { name: "Conversation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Minimise chat" })).toBeFocused();
});

test("saved kits come back on the next visit", async ({ page }) => {
  await page.goto("/kit");
  await page.evaluate(() => {
    localStorage.removeItem("ee.kit.saved.v1");
    localStorage.removeItem("ee.kit.v1");
  });
  await page.goto("/kit?occasion=walima&trami=60&tier=premium&prefs=extra");
  // With the chat minimised the kit sits in the page, on phones too.
  await page.getByRole("button", { name: "Minimise chat" }).click();
  const panel = page.locator('section[aria-labelledby="kit-title"]');
  await panel.getByRole("button", { name: "Save kit for later" }).click();
  await expect(panel.getByRole("button", { name: "Update saved kit" })).toBeVisible();

  // Start a fresh kit: the saved one is offered right in the chat.
  await openChat(page);
  await page.getByRole("button", { name: /Start over/ }).click();
  await expect(page.getByRole("list", { name: "Saved kits" })).toBeVisible();
  await page.getByRole("button", { name: "Open saved kit: Walima kit · 60 trami" }).click();
  await expect(panel.getByText("Walima · 60 trami")).toBeVisible();
  await expect(panel.getByRole("button", { name: /^Cake plate / })).toBeVisible();

  // Also reachable from the kit header, and deletable.
  await panel.getByRole("button", { name: "Saved (1)" }).click();
  const dialog = page.getByRole("dialog", { name: "Saved kits" });
  await dialog.getByRole("button", { name: "Delete saved kit: Walima kit · 60 trami" }).click();
  await expect(dialog.getByRole("list", { name: "Saved kits" })).toHaveCount(0);
});

test("customers can name their function, or bring their own, and the name follows the kit", async ({ page, isMobile }) => {
  await page.goto("/cart");
  await page.evaluate(() => {
    localStorage.removeItem("ee.kit.v1");
    localStorage.removeItem("ee.cart.v1");
  });

  // Their own function needs a name before it can go ahead.
  await page.goto("/kit");
  await page.getByRole("button", { name: /^Your own function/ }).click();
  await expect(page.getByText("Needed for your own function")).toBeVisible();
  await page.getByLabel("Function name").fill("Zayn ka Aqeeqah");
  await page.getByRole("button", { name: /^Zayn ka Aqeeqah/ }).click();
  await expect(page.getByRole("button", { name: "Change answer: Zayn ka Aqeeqah" })).toBeVisible();
  await expect(page).toHaveURL(/occasion=other&name=Zayn\+ka\+Aqeeqah/);

  // A shop function with their own name on it; the name can be changed from the kit.
  await page.goto("/kit?occasion=nikkah&name=Sana+ki+Nikkah&trami=30&tier=standard");
  const panel = await kitPanel(page, isMobile);
  await panel.getByRole("button", { name: /Sana ki Nikkah.*change function name/ }).click();
  await panel.getByLabel("Function name").fill("Sana & Ayaan ki Nikkah");
  await panel.getByRole("button", { name: "Save name" }).click();
  await expect(page).toHaveURL(/name=Sana\+%26\+Ayaan\+ki\+Nikkah/);

  await panel.getByRole("button", { name: "Add kit to bag" }).click();
  await page.goto("/cart");
  await expect(page.getByRole("region", { name: "Items in your bag" }).getByText("Sana & Ayaan ki Nikkah · 30 trami")).toBeVisible();
});

test("counting by guests gives one of each item per guest, with shared supplies scaled", async ({ page, isMobile }) => {
  await page.goto("/kit");
  await page.evaluate(() => localStorage.removeItem("ee.kit.v1"));
  await page.goto("/kit?occasion=wazwan");
  await page.getByRole("radio", { name: "By guests" }).click();
  await page.getByRole("textbox", { name: "Guests" }).fill("203");
  await page.getByRole("button", { name: "Yes, 203 guests" }).click();
  await expect(page.getByRole("button", { name: "Change answer: 203 guests" })).toBeVisible();
  await expect(page).toHaveURL(/occasion=wazwan&guests=203/);

  const panel = await kitPanel(page, isMobile);
  // Per person: one each. Shared supplies: one trash bag per 20 guests.
  await expect(row(panel, "Spoon")).toContainText("203 pcs");
  await expect(row(panel, "Dastarkhan")).toContainText("203 pcs");
  await expect(row(panel, "Trash bag")).toContainText("11 pcs");
});

test("several types of one item (100 plastic + 50 wooden spoons), other items from the picker — all in the bag as one kit", async ({
  page,
  isMobile,
}) => {
  await page.goto("/cart");
  await page.evaluate(() => localStorage.removeItem("ee.cart.v1"));
  await page.goto("/kit?occasion=wazwan&trami=50&tier=basic");
  const panel = await kitPanel(page, isMobile);

  // Spoon: 100 Plastic small (suggested type) and 50 Wooden small.
  await openRow(panel, "Spoon");
  const types = panel.getByRole("group", { name: "Spoon type" });
  await types.getByRole("button", { name: "Add Wooden small" }).click();
  // Plastic already covers the suggested 200, so the new type starts at half (100).
  const plastic = types.getByRole("group", { name: "Quantity for Spoon Plastic small" });
  const woodenQty = types.getByRole("group", { name: "Quantity for Spoon Wooden small" });
  await expect(woodenQty).toBeVisible();
  await expect(woodenQty.getByRole("textbox")).toHaveValue("100");
  await plastic.getByRole("textbox").fill("100");
  await woodenQty.getByRole("textbox").fill("50");
  await expect(row(panel, "Spoon")).toContainText("Plastic small 100 · Wooden small 50");
  await expect(panel.getByText("Total 150 ·")).toBeVisible();

  // Taking one type out keeps the other.
  await types.getByRole("button", { name: "Remove Spoon Plastic small" }).click();
  await expect(row(panel, "Spoon")).toContainText("Wooden small · 50 pcs");
  await types.getByRole("button", { name: "Add Plastic small" }).click();
  await expect(row(panel, "Spoon")).toContainText("Wooden small 50 · Plastic small 150");

  // Something this occasion doesn't include: potli, from the picker in the kit header or below the list.
  await panel
    .getByRole("button", { name: /^Add items/ })
    .first()
    .click();
  const picker = page.getByRole("dialog", { name: "Add items" });
  await picker.getByRole("searchbox", { name: "Search items" }).fill("potli");
  await picker.getByRole("button", { name: "Add Potli Special" }).click();
  await expect(picker).toBeHidden();
  await expect(row(panel, "Potli")).toContainText("Special · 50 pcs");
  await expect(row(panel, "Potli")).toContainText("Added");

  const expected = kitTotal(
    buildKit({
      occasion: "wazwan",
      trami: 50,
      tier: "basic",
      prefs: NO_PREFS,
      overrides: { spoon: { variantIndex: 2, qty: 50 } },
      added: [
        { id: "x", itemId: "spoon", variantIndex: 0, qty: 150 },
        { id: "y", itemId: "potli", variantIndex: 1, qty: 50 },
      ],
    }),
  );
  await expect(footerTotal(panel)).toHaveText(formatKitAmount(expected));

  // Removing an added item can be undone.
  await openRow(panel, "Potli");
  await panel.getByRole("button", { name: "Remove Potli", exact: true }).click();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(row(panel, "Potli")).toBeVisible();

  await panel.getByRole("button", { name: "Add kit to bag" }).click();
  await page.goto("/cart");
  const bag = page.getByRole("region", { name: "Items in your bag" });
  await expect(bag.getByText("1 item", { exact: true })).toBeVisible();
  await bag.getByText("View 18 items").click();
  await expect(bag.getByText(/^Spoon · Wooden small × 50$/)).toBeVisible();
  await expect(bag.getByText(/^Spoon · Plastic small × 150$/)).toBeVisible();
  await expect(bag.getByText(/^Potli · Special × 50$/)).toBeVisible();
});

test("tapping an item's picture or name opens its details", async ({ page, isMobile }) => {
  await page.goto("/kit?occasion=wazwan&trami=50&tier=basic");
  const panel = await kitPanel(page, isMobile);

  await row(panel, "Spoon").getByText("Spoon", { exact: true }).click();
  const details = page.getByRole("dialog", { name: "Spoon" });
  await expect(details).toBeVisible();
  await expect(details.getByText("Suggested for your kit")).toBeVisible();
  await expect(details.getByText("200 in kit")).toBeVisible(); // Plastic small, the Basic pick
  for (const type of ["Plastic small", "Plastic medium", "Wooden small", "Wooden large"])
    await expect(details.getByText(type)).toBeVisible();
  // The row itself stayed closed.
  await expect(row(panel, "Spoon")).toHaveAttribute("aria-expanded", "false");

  await details.getByRole("button", { name: "Change quantities" }).click();
  await expect(details).toBeHidden();
  await expect(row(panel, "Spoon")).toHaveAttribute("aria-expanded", "true");

  // From the open row, keyboard users have a button for it too.
  await panel.getByRole("button", { name: "View details" }).click();
  await expect(page.getByRole("dialog", { name: "Spoon" })).toBeVisible();
});

test("the function date can be picked on a calendar, and Previous question goes back a question", async ({ page }) => {
  await page.goto("/kit?occasion=walima");
  await page.getByRole("button", { name: "Yes, 50 trami" }).click();

  // A date about two months ahead, in the field's YYYY-MM-DD format.
  const ahead = new Date();
  ahead.setDate(ahead.getDate() + 60);
  const iso = `${ahead.getFullYear()}-${String(ahead.getMonth() + 1).padStart(2, "0")}-${String(ahead.getDate()).padStart(2, "0")}`;
  await page.getByLabel("Function date").fill(iso);
  await expect(page.locator("#kit-date-hint")).toContainText("in 60 days");
  await page.getByRole("button", { name: "Use this date" }).click();
  const day = ahead.toLocaleDateString("en-IN", { day: "numeric" });
  await expect(page.getByRole("button", { name: new RegExp(`^Change answer: .*${day}`) })).toBeVisible();
  await expect(chat(page).getByText("What budget do you have in mind?")).toBeVisible();

  // Back to the date (still filled in), then back to the trami question.
  await page.getByRole("button", { name: "Previous question" }).click();
  await expect(page.getByLabel("Function date")).toHaveValue(iso);
  await page.getByRole("button", { name: "Previous question" }).click();
  await expect(page.getByRole("textbox", { name: "Trami" })).toHaveValue("50");
  // Answering again returns to where we were.
  await page.getByRole("button", { name: "Yes, 50 trami" }).click();
  await expect(chat(page).getByText("What budget do you have in mind?")).toBeVisible();
});
