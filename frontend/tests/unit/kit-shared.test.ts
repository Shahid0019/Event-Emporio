import { describe, expect, it } from "vitest";
import { buildKit, kitTotal, NO_PREFS } from "@/lib/kit/buildKit";
import { CUSTOM_FUNCTION, KIT_MAX_PER_ORDER } from "@/lib/kit/config";
import { decodeSharedKit, encodeSharedKit, type SharedKit } from "@/lib/kit/shared";

const kit: SharedKit = {
  occasion: "walima",
  trami: 80,
  tier: "premium",
  prefs: { bio: true, printed: false, extra: true },
  date: "two-weeks",
  overrides: { box: { variantIndex: 0 }, spoon: { qty: 400 }, knife: { removed: true } },
  customerName: "Ayesha Mir",
  note: "Steel basket nahi, carpet box rakha hai — sasta padega.",
};

const toB64 = (json: unknown) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(json))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

describe("shared kit links", () => {
  it("round-trips a full kit, including Unicode text", () => {
    const decoded = decodeSharedKit(encodeSharedKit(kit));
    expect(decoded).toEqual(kit);
    // Same kit → same total on the customer's side.
    expect(kitTotal(buildKit(decoded!))).toBe(kitTotal(buildKit(kit)));
  });

  it("is URL-safe and short enough for WhatsApp", () => {
    const encoded = encodeSharedKit(kit);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encoded.length).toBeLessThan(600);
  });

  it("omits empty fields", () => {
    const decoded = decodeSharedKit(
      encodeSharedKit({ occasion: "wazwan", trami: 50, tier: "standard", prefs: NO_PREFS, date: null, overrides: {} }),
    );
    expect(decoded).toEqual({
      occasion: "wazwan",
      trami: 50,
      tier: "standard",
      prefs: NO_PREFS,
      date: null,
      overrides: {},
      customerName: undefined,
      note: undefined,
    });
  });

  it("rejects malformed or tampered links", () => {
    for (const bad of [
      null,
      "",
      "not-base64!!",
      toB64({ v: 2, o: "wazwan", t: 50, r: "standard" }),
      toB64({ v: 1, o: "Party Night!", t: 50, r: "standard" }),
      toB64({ v: 1, o: "../admin", t: 50, r: "standard" }),
    ]) {
      expect(decodeSharedKit(bad)).toBeNull();
    }
    expect(decodeSharedKit(toB64({ v: 1, o: "wazwan", t: 5000, r: "standard" }))).toBeNull();
    expect(decodeSharedKit(toB64({ v: 1, o: "wazwan", t: 50, r: "standard", n: "x".repeat(500) }))).toBeNull();
    expect(decodeSharedKit(toB64({ v: 1, o: "wazwan", t: 50, r: "standard", f: "x".repeat(500) }))).toBeNull();
    expect(decodeSharedKit("A".repeat(5000))).toBeNull();
  });

  it("carries the shopper's own function name", () => {
    const own: SharedKit = { ...kit, occasion: CUSTOM_FUNCTION, title: "Aqeeqah — Zayn" };
    expect(decodeSharedKit(encodeSharedKit(own))).toEqual(own);
    // Names are tidied, and a blank one is left out.
    expect(decodeSharedKit(encodeSharedKit({ ...kit, title: "  Sana   ki Mehndi " }))?.title).toBe("Sana ki Mehndi");
    expect(decodeSharedKit(encodeSharedKit({ ...kit, title: "   " }))).not.toHaveProperty("title");
  });

  it("keeps working for a function the shop has since removed (everyday items only)", () => {
    const decoded = decodeSharedKit(toB64({ v: 1, o: "engagement", t: 50, r: "standard" }));
    expect(decoded?.occasion).toBe("engagement");
    const items = buildKit(decoded!).map((l) => l.itemId);
    expect(items).toContain("dastarkhan");
    expect(items).not.toContain("potli");
  });

  it("drops unknown items and clamps out-of-range edits", () => {
    const decoded = decodeSharedKit(
      toB64({ v: 1, o: "wazwan", t: 50, r: "standard", i: { hacked: [0, 5, 0], knife: [9, 999999, 0], spoon: [-1, 0, 1] } }),
    );
    expect(decoded?.overrides).toEqual({ knife: { qty: KIT_MAX_PER_ORDER }, spoon: { removed: true } });
  });
});
