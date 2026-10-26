import { beforeAll, describe, expect, it } from "vitest";
import { diffAdminData, hasChanges, type AdminData } from "@/lib/admin-data";
import { getDb } from "@/lib/db/client";
import { authenticate, changePassword, createPasswordReset, registerAccount, resetPassword } from "@/lib/server/accounts";
import { applyAdminChanges, loadAdminData } from "@/lib/server/admin-data";
import {
  confirmCodOrder,
  createPendingOrder,
  markOrderPaid,
  markOrderRefunded,
  orderForLookup,
  orderForToken,
  orderKinds,
  orderRequestSchema,
  ordersForCustomer,
  type OrderRequest,
} from "@/lib/server/orders";
import type { Order, OrderLine, Product } from "@/lib/types";
import { loadProductReviews } from "@/lib/db/queries";
import { reviewByCustomer, reviewerName, saveReview } from "@/lib/server/reviews";

// Its own database, so stock changes here don't affect the other test files.
beforeAll(() => {
  process.env.MONGODB_DB = "events_emporio_flows";
});

const checkout = (lines: OrderRequest["lines"], paymentMethod: "razorpay" | "cod" = "razorpay") =>
  orderRequestSchema.parse({
    paymentMethod,
    email: "asha@example.com",
    phone: "9876543210",
    shipping: {
      fullName: "Asha Bhat",
      line1: "12 Residency Road",
      city: "Srinagar",
      state: "Jammu and Kashmir",
      pincode: "190001",
      country: "India",
    },
    shippingMethod: "standard",
    lines,
  });

const stockOf = async (productId: string, variantId: string) => {
  const p = (await (await getDb()).collection("products").findOne({ _id: productId as never })) as unknown as Product;
  return p.variants.find((v) => v.id === variantId)!.stock;
};

describe("orders", () => {
  it("sorts orders into product and built kit orders", () => {
    const line = (bundle?: OrderLine["bundle"]) => ({ bundle }) as OrderLine;
    expect(orderKinds([line()])).toEqual(["regular"]);
    expect(orderKinds([line({ id: "k", name: "K", summary: "" })])).toEqual(["built-kit"]);
    expect(orderKinds([line(), line({ id: "k", name: "K", summary: "" })])).toEqual(["regular", "built-kit"]);
  });

  it("creates a pending order at server prices, then takes stock once when paid", async () => {
    const before = await stockOf("p_001", "ee-mb-rose-v2");
    const res = await createPendingOrder(
      checkout([
        {
          productId: "p_001",
          variantId: "ee-mb-rose-v2",
          quantity: 2,
          bundle: { id: "b1", name: "Wazwan kit", summary: "50 trami" },
        },
      ]),
    );
    if (!res.ok) throw new Error(res.error);
    expect(res.order.status).toBe("pending");
    expect(res.order.kinds).toEqual(["built-kit"]);
    expect(res.order.totals.subtotal).toBe(439800);
    expect(res.order.number).toMatch(/^EE\d{7}$/);

    // Not visible to order tracking until paid; never stock-taken before payment.
    expect(await orderForLookup(res.order.number, "asha@example.com")).toBeNull();
    expect(await stockOf("p_001", "ee-mb-rose-v2")).toBe(before);

    const paid = await markOrderPaid(res.order.id, "pay_test_1");
    expect(paid?.status).toBe("confirmed");
    expect(await stockOf("p_001", "ee-mb-rose-v2")).toBe(before - 2);

    // Webhook and browser both confirm: the second call changes nothing.
    await markOrderPaid(res.order.id, "pay_test_1");
    expect(await stockOf("p_001", "ee-mb-rose-v2")).toBe(before - 2);

    expect((await orderForLookup(res.order.number.toLowerCase(), "ASHA@example.com"))?.id).toBe(res.order.id);
    expect(await orderForLookup(res.order.number, "someone@else.com")).toBeNull();
  });

  it("only shows the confirmation page with the checkout's own token", async () => {
    const res = await createPendingOrder(checkout([{ productId: "p_007", variantId: "ee-bh-dry-v1", quantity: 1 }]));
    if (!res.ok) throw new Error(res.error);
    expect(await orderForToken(res.order.number, res.accessToken)).not.toBeNull();
    expect(await orderForToken(res.order.number, "guess")).toBeNull();
    expect(await orderForToken(res.order.number, "")).toBeNull();
  });

  it("refuses an order when nothing in it can be sold", async () => {
    const res = await createPendingOrder(checkout([{ productId: "p_001", variantId: "ee-mb-rose-v3", quantity: 1 }]));
    expect(res.ok).toBe(false);
  });
});

describe("customer accounts", () => {
  it("registers, signs in, rejects wrong passwords and duplicate emails", async () => {
    const res = await registerAccount({ name: "Zara Mir", email: "Zara@Example.com", password: "long-enough-1" });
    if (!res.ok) throw new Error(res.error);
    expect(res.account.email).toBe("zara@example.com");
    expect(res.account).not.toHaveProperty("passwordHash");

    expect((await authenticate("zara@example.com", "long-enough-1"))?.id).toBe(res.account.id);
    expect(await authenticate("zara@example.com", "wrong-password")).toBeNull();
    expect(await authenticate("nobody@example.com", "long-enough-1")).toBeNull();
    expect((await registerAccount({ name: "Z", email: "zara@example.com", password: "another-pass-1" })).ok).toBe(false);
  });

  it("changes and resets passwords; reset links work once", async () => {
    const res = await registerAccount({ name: "Imran", email: "imran@example.com", password: "first-pass-1" });
    if (!res.ok) throw new Error(res.error);
    expect(await changePassword(res.account.id, "wrong", "second-pass-1")).toBe(false);
    expect(await changePassword(res.account.id, "first-pass-1", "second-pass-1")).toBe(true);
    expect(await authenticate("imran@example.com", "second-pass-1")).not.toBeNull();

    const reset = await createPasswordReset("imran@example.com");
    expect(reset).not.toBeNull();
    expect(await resetPassword(reset!.token, "third-pass-1")).toBe(true);
    expect(await resetPassword(reset!.token, "fourth-pass-1")).toBe(false);
    expect(await authenticate("imran@example.com", "third-pass-1")).not.toBeNull();
    expect(await createPasswordReset("nobody@example.com")).toBeNull();
  });

  it("lists a customer's paid orders only", async () => {
    const acc = await registerAccount({ name: "Sana", email: "sana@example.com", password: "sana-pass-12" });
    if (!acc.ok) throw new Error(acc.error);
    const unpaid = await createPendingOrder(checkout([{ productId: "p_007", variantId: "ee-bh-dry-v1", quantity: 1 }]), acc.account.id);
    const paid = await createPendingOrder(checkout([{ productId: "p_007", variantId: "ee-bh-dry-v1", quantity: 1 }]), acc.account.id);
    if (!unpaid.ok || !paid.ok) throw new Error("order failed");
    await markOrderPaid(paid.order.id, "pay_test_2");
    expect((await ordersForCustomer(acc.account.id)).map((o) => o.id)).toEqual([paid.order.id]);
  });
});

describe("admin saves", () => {
  const save = async (mutate: (d: AdminData) => void) => {
    const before = await loadAdminData("admin@test");
    const after = structuredClone(before);
    mutate(after);
    return applyAdminChanges(diffAdminData(before, after), "admin@test");
  };

  it("sends only what changed", async () => {
    const before = await loadAdminData("admin@test");
    expect(hasChanges(diffAdminData(before, structuredClone(before)))).toBe(false);
    const after = structuredClone(before);
    after.categories[0].name = "Renamed";
    after.kitFunctions.pop();
    const changes = diffAdminData(before, after);
    expect(changes.upserts.categories).toHaveLength(1);
    expect(changes.deletes.kitFunctions).toHaveLength(1);
    expect(changes.upserts.products).toBeUndefined();
  });

  it("saves product edits and records who made them", async () => {
    const res = await save((d) => {
      d.products.find((p) => p.id === "p_007")!.name = "Dry fruit basket — large";
    });
    expect(res).toMatchObject({ ok: true });
    const data = await loadAdminData("admin@test");
    expect(data.products.find((p) => p.id === "p_007")!.name).toBe("Dry fruit basket — large");
    expect(data.auditLog[0]).toMatchObject({ by: "admin@test" });
  });

  it("rejects invalid data without writing anything", async () => {
    const res = await save((d) => {
      d.products.find((p) => p.id === "p_007")!.name = "Should not save";
      d.products.find((p) => p.id === "p_001")!.variants[0].price = -5;
    });
    expect(res.ok).toBe(false);
    const data = await loadAdminData("admin@test");
    expect(data.products.find((p) => p.id === "p_007")!.name).not.toBe("Should not save");
  });

  it("moves orders only along the normal steps and never edits payments", async () => {
    const res = await createPendingOrder(checkout([{ productId: "p_007", variantId: "ee-bh-dry-v1", quantity: 1 }]));
    if (!res.ok) throw new Error(res.error);
    await markOrderPaid(res.order.id, "pay_test_3");
    const order = (d: AdminData) => d.orders.find((o) => o.id === res.order.id)!;

    expect((await save((d) => void (order(d).status = "delivered"))).ok).toBe(false);
    expect((await save((d) => void (order(d).paymentStatus = "refunded"))).ok).toBe(false);
    expect((await save((d) => void (order(d).totals.total = 1))).ok).toBe(true); // ignored: totals aren't editable
    expect(await save((d) => void (order(d).status = "processing"))).toMatchObject({ ok: true });

    const data = await loadAdminData("admin@test");
    expect(order(data)).toMatchObject({ status: "processing", paymentStatus: "paid", totals: res.order.totals });
    expect(order(data)).not.toHaveProperty("accessToken");
  });

  it("an order saved with empty optional fields can still be shipped, and a cleared note is removed", async () => {
    const res = await createPendingOrder(checkout([{ productId: "p_007", variantId: "ee-bh-dry-v1", quantity: 1 }]));
    if (!res.ok) throw new Error(res.error);
    await markOrderPaid(res.order.id, "pay_test_5");
    const order = (d: AdminData) => d.orders.find((o) => o.id === res.order.id)!;
    const step = (status: Order["status"], extra: Partial<Order> = {}) =>
      save((d) => {
        Object.assign(order(d), extra, { status });
        order(d).history.push({ status, at: new Date().toISOString(), note: undefined });
      });

    expect(await step("processing", { staffNote: "Gift wrap" })).toMatchObject({ ok: true });
    expect(await step("shipped", { staffNote: undefined, tracking: { carrier: "Test Courier", number: "TC123" } })).toMatchObject({
      ok: true,
    });
    const shipped = order(await loadAdminData("admin@test"));
    expect(shipped).toMatchObject({ status: "shipped", tracking: { carrier: "Test Courier", number: "TC123" } });
    expect(shipped).not.toHaveProperty("staffNote");
    expect(await step("delivered")).toMatchObject({ ok: true });
  });
});

describe("admin stock edits and live sales", () => {
  it("a product saved from a screen opened before a sale keeps the sale's stock change", async () => {
    const screen = await loadAdminData("admin@test"); // manager opens the product
    const start = await stockOf("p_003", "ee-mb-fav-v1");

    // A customer buys 3 meanwhile.
    const res = await createPendingOrder(checkout([{ productId: "p_003", variantId: "ee-mb-fav-v1", quantity: 3 }]));
    if (!res.ok) throw new Error(res.error);
    await markOrderPaid(res.order.id, "pay_test_4");

    // The manager renames it and adds 10 to stock, from the old screen.
    const after = structuredClone(screen);
    const p = after.products.find((x) => x.id === "p_003")!;
    p.name = "Favour basket";
    p.variants.find((v) => v.id === "ee-mb-fav-v1")!.stock += 10;
    expect(await applyAdminChanges(diffAdminData(screen, after), "admin@test")).toMatchObject({ ok: true });

    expect(await stockOf("p_003", "ee-mb-fav-v1")).toBe(start - 3 + 10);
    const saved = (await loadAdminData("admin@test")).products.find((x) => x.id === "p_003")!;
    expect(saved.name).toBe("Favour basket");
    expect(saved.salesCount).toBe(screen.products.find((x) => x.id === "p_003")!.salesCount + 3);
  });
});

describe("cash on delivery", () => {
  const save = async (mutate: (d: AdminData) => void) => {
    const before = await loadAdminData("admin@test");
    const after = structuredClone(before);
    mutate(after);
    return applyAdminChanges(diffAdminData(before, after), "admin@test");
  };

  it("confirms the order at once, takes stock once, and leaves the cash to collect", async () => {
    const before = await stockOf("p_007", "ee-bh-dry-v1");
    const res = await createPendingOrder(checkout([{ productId: "p_007", variantId: "ee-bh-dry-v1", quantity: 2 }], "cod"));
    if (!res.ok) throw new Error(res.error);
    expect(res.order.paymentMethod).toBe("cod");

    const confirmed = await confirmCodOrder(res.order.id);
    expect(confirmed).toMatchObject({ status: "confirmed", paymentStatus: "pending" });
    expect(await stockOf("p_007", "ee-bh-dry-v1")).toBe(before - 2);
    // Trackable straight away, and confirming again changes nothing.
    expect((await orderForLookup(res.order.number, "asha@example.com"))?.id).toBe(res.order.id);
    expect(await confirmCodOrder(res.order.id)).toBeNull();
    expect(await stockOf("p_007", "ee-bh-dry-v1")).toBe(before - 2);
  });

  it("an online order can't be confirmed as cash on delivery", async () => {
    const res = await createPendingOrder(checkout([{ productId: "p_007", variantId: "ee-bh-dry-v1", quantity: 1 }]));
    if (!res.ok) throw new Error(res.error);
    expect(await confirmCodOrder(res.order.id)).toBeNull();
  });

  it("the admin records cash collected for COD only", async () => {
    const cod = await createPendingOrder(checkout([{ productId: "p_007", variantId: "ee-bh-dry-v1", quantity: 1 }], "cod"));
    const online = await createPendingOrder(checkout([{ productId: "p_007", variantId: "ee-bh-dry-v1", quantity: 1 }]));
    if (!cod.ok || !online.ok) throw new Error("order failed");
    await confirmCodOrder(cod.order.id);

    const rejected = await save((d) => void (d.orders.find((o) => o.id === online.order.id)!.paymentStatus = "paid"));
    expect(rejected.ok).toBe(false);

    const collected = await save((d) => void (d.orders.find((o) => o.id === cod.order.id)!.paymentStatus = "paid"));
    expect(collected).toMatchObject({ ok: true });
    expect((await orderForToken(cod.order.number, cod.accessToken))?.paymentStatus).toBe("paid");
  });

  it("a refund from the Razorpay dashboard closes a paid order only", async () => {
    const paid = await createPendingOrder(checkout([{ productId: "p_007", variantId: "ee-bh-dry-v1", quantity: 1 }]));
    const unpaid = await createPendingOrder(checkout([{ productId: "p_007", variantId: "ee-bh-dry-v1", quantity: 1 }]));
    if (!paid.ok || !unpaid.ok) throw new Error("order failed");
    await markOrderPaid(paid.order.id, "pay_refund_1");
    await markOrderRefunded(paid.order.id, "Refunded through Razorpay");
    await markOrderRefunded(unpaid.order.id, "Refunded through Razorpay");
    expect(await orderForToken(paid.order.number, paid.accessToken)).toMatchObject({ status: "refunded", paymentStatus: "refunded" });
    expect(await orderForToken(unpaid.order.number, unpaid.accessToken)).toMatchObject({ status: "pending", paymentStatus: "pending" });
  });
});

describe("product reviews", () => {
  const review = { productId: "p_007", rating: 5, title: "Lovely", text: "Beautifully packed and arrived on time." };

  it("shows a first name and initial only", () => {
    expect(reviewerName("Aisha Khan")).toBe("Aisha K.");
    expect(reviewerName("  Rafiq  ")).toBe("Rafiq");
  });

  it("waits for approval, stays one per customer, and marks verified purchases", async () => {
    const acc = await registerAccount({ name: "Nida Shah", email: "nida@example.com", password: "nida-pass-12" });
    if (!acc.ok) throw new Error(acc.error);

    const first = await saveReview(acc.account.id, review);
    if (!first.ok) throw new Error(first.error);
    expect(first.review).toMatchObject({ status: "pending", displayName: "Nida S.", verifiedPurchase: false });
    expect((await loadProductReviews("p_007")).some((r) => r.id === first.review.id)).toBe(false);

    // The shop publishes it.
    const before = await loadAdminData("admin@test");
    const after = structuredClone(before);
    after.productReviews.find((r) => r.id === first.review.id)!.status = "approved";
    expect(await applyAdminChanges(diffAdminData(before, after), "admin@test")).toMatchObject({ ok: true });
    expect((await loadProductReviews("p_007")).some((r) => r.id === first.review.id)).toBe(true);

    // After buying it, editing keeps the same review, marks it verified and sends it back for approval.
    const order = await createPendingOrder(checkout([{ productId: "p_007", variantId: "ee-bh-dry-v1", quantity: 1 }]), acc.account.id);
    if (!order.ok) throw new Error(order.error);
    await markOrderPaid(order.order.id, "pay_review_1");
    const edited = await saveReview(acc.account.id, { ...review, rating: 4 });
    if (!edited.ok) throw new Error(edited.error);
    expect(edited.review).toMatchObject({ id: first.review.id, rating: 4, status: "pending", verifiedPurchase: true });
    expect((await reviewByCustomer(acc.account.id, "p_007"))?.rating).toBe(4);
  });

  it("refuses unknown products and signed-out customers", async () => {
    expect(await saveReview("cus_missing", review)).toMatchObject({ ok: false, status: 401 });
    const acc = await registerAccount({ name: "Omar", email: "omar@example.com", password: "omar-pass-12" });
    if (!acc.ok) throw new Error(acc.error);
    expect(await saveReview(acc.account.id, { ...review, productId: "nope" })).toMatchObject({ ok: false, status: 404 });
  });
});
