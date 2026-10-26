"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Download, Eye, Lock, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, fieldAria, Input, Select, Textarea } from "@/components/ui/field";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import type { CustomerSummary } from "@/lib/admin-data";
import { adminStore, updateAdmin } from "@/lib/store/admin-store";
import type { Coupon } from "@/lib/types";
import { cn, formatDate, formatPrice, newId } from "@/lib/utils";
import { couponFormSchema } from "@/lib/validations";
import { AdminHeader, ConfirmAction, DataTable, downloadCsv, Toggle, type Column } from "./admin-ui";

/* --------------------------------- Customers ----------------------------- */
export function CustomersAdmin() {
  const { customers } = adminStore.useStore();
  const columns: Column<CustomerSummary>[] = [
    {
      key: "name",
      header: "Customer",
      sortValue: (c) => c.name,
      cell: (c) => (
        <span>
          <span className="block font-medium">{c.name}</span>
          <a href={`mailto:${c.email}`} className="text-[0.78rem] text-muted hover:text-ink">
            {c.email}
          </a>
          {c.phone && <span className="block text-[0.78rem] text-muted">{c.phone}</span>}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortValue: (c) => (c.hasAccount ? 1 : 0),
      cell: (c) => <Badge tone={c.hasAccount ? "accent" : "muted"}>{c.hasAccount ? "Account" : "Guest"}</Badge>,
    },
    { key: "orders", header: "Paid orders", sortValue: (c) => c.orders, cell: (c) => <span className="tabular-nums">{c.orders}</span> },
    {
      key: "spent",
      header: "Total spent",
      sortValue: (c) => c.spent,
      cell: (c) => <span className="tabular-nums">{formatPrice(c.spent)}</span>,
    },
    {
      key: "last",
      header: "Last order",
      sortValue: (c) => c.lastOrderAt ?? "",
      cell: (c) => <span className="text-muted">{c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"}</span>,
    },
  ];
  return (
    <>
      <AdminHeader
        title="Customers"
        description="Everyone with an account, plus guests who've paid for an order."
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={!customers.length}
            onClick={() =>
              downloadCsv("customers.csv", [
                ["Name", "Email", "Phone", "Type", "Paid orders", "Spent (INR)", "Last order"],
                ...customers.map((c) => [
                  c.name,
                  c.email,
                  c.phone,
                  c.hasAccount ? "Account" : "Guest",
                  c.orders,
                  c.spent / 100,
                  c.lastOrderAt ?? "",
                ]),
              ])
            }
          >
            <Download /> Export
          </Button>
        }
      />
      {customers.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6 stroke-[1.25]" />}
          title="No customers yet"
          description="Customers appear here when they create an account or pay for an order."
        />
      ) : (
        <DataTable
          rows={customers}
          columns={columns}
          rowKey={(c) => c.id}
          searchText={(c) => `${c.name} ${c.email} ${c.phone}`}
          searchPlaceholder="Search name, email or phone"
          initialSort={{ key: "spent", dir: "desc" }}
        />
      )}
      <p className="mt-4 text-[0.8rem] text-muted">Keep exported customer lists private — they contain personal details.</p>
    </>
  );
}

/* ---------------------------------- Coupons ------------------------------ */
type CouponValues = z.input<typeof couponFormSchema>;

export function CouponsAdmin() {
  const { coupons } = adminStore.useStore();
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const state = (c: Coupon) =>
    !c.isActive ? "Disabled" : new Date() > new Date(c.expiresAt) ? "Expired" : new Date() < new Date(c.startsAt) ? "Scheduled" : "Active";

  const columns: Column<Coupon>[] = [
    { key: "code", header: "Code", sortValue: (c) => c.code, cell: (c) => <span className="font-mono font-medium">{c.code}</span> },
    {
      key: "value",
      header: "Discount",
      cell: (c) => (
        <span>
          {c.type === "percentage" ? `${c.value}%` : formatPrice(c.value)}
          {c.maxDiscount ? <span className="text-muted"> · max {formatPrice(c.maxDiscount)}</span> : null}
        </span>
      ),
    },
    { key: "min", header: "Min. order", cell: (c) => (c.minSubtotal ? formatPrice(c.minSubtotal) : "—") },
    {
      key: "usage",
      header: "Used",
      sortValue: (c) => c.usedCount,
      cell: (c) => `${c.usedCount}${c.usageLimit ? ` / ${c.usageLimit}` : ""}`,
    },
    {
      key: "dates",
      header: "Valid",
      cell: (c) => (
        <span className="text-[0.8rem] text-muted">
          {formatDate(c.startsAt)} – {formatDate(c.expiresAt)}
        </span>
      ),
    },
    {
      key: "visibility",
      header: "Shown to",
      sortValue: (c) => (c.showInBag === false ? 1 : 0),
      cell: (c) =>
        c.showInBag === false ? (
          <Badge tone="muted" className="gap-1">
            <Lock className="size-3" /> Private
          </Badge>
        ) : (
          <Badge tone="brand" className="gap-1">
            <Eye className="size-3" /> Public
          </Badge>
        ),
    },
    {
      key: "state",
      header: "Status",
      cell: (c) => {
        const s = state(c);
        return <Badge tone={s === "Active" ? "success" : s === "Scheduled" ? "accent" : "muted"}>{s}</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (c) => (
        <span className="inline-flex gap-1">
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${c.code}`} onClick={() => setEditing(c)}>
            <Pencil />
          </Button>
          <ConfirmAction
            trigger={
              <Button variant="ghost" size="icon" className="size-8 text-danger" aria-label={`Delete ${c.code}`}>
                <Trash2 />
              </Button>
            }
            title={`Delete ${c.code}?`}
            description="Customers will no longer be able to use this code. Past orders keep their discount."
            confirmLabel="Delete"
            destructive
            onConfirm={() => {
              updateAdmin((d) => (d.coupons = d.coupons.filter((x) => x.code !== c.code)));
              toast("Coupon deleted");
            }}
          />
        </span>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Coupons"
        description="Validated on the server at checkout — never trusted from the browser."
        actions={
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus /> Create coupon
          </Button>
        }
      />
      <DataTable rows={coupons} columns={columns} rowKey={(c) => c.code} searchText={(c) => c.code} />
      <Sheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing && editing !== "new" ? `Edit ${editing.code}` : "New coupon"}
      >
        {editing !== null && <CouponForm coupon={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </>
  );
}

function CouponForm({ coupon, onDone }: { coupon?: Coupon; onDone: () => void }) {
  const [isActive, setIsActive] = useState(coupon?.isActive ?? true);
  const [visibility, setVisibility] = useState<"public" | "private">(coupon?.showInBag === false ? "private" : "public");
  // New codes default to starting today and running for 30 days.
  const [defaultDates] = useState(() => {
    const now = new Date();
    return { start: now.toISOString().slice(0, 10), end: new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10) };
  });
  const { register, handleSubmit, formState, control, setError } = useForm<CouponValues, unknown, z.output<typeof couponFormSchema>>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      code: coupon?.code ?? "",
      type: coupon?.type ?? "percentage",
      value: coupon ? (coupon.type === "fixed" ? coupon.value / 100 : coupon.value) : "",
      minSubtotal: coupon ? coupon.minSubtotal / 100 : 0,
      maxDiscount: coupon?.maxDiscount ? coupon.maxDiscount / 100 : "",
      usageLimit: coupon?.usageLimit ?? "",
      perCustomerLimit: coupon?.perCustomerLimit ?? "",
      startsAt: coupon?.startsAt.slice(0, 10) ?? defaultDates.start,
      expiresAt: coupon?.expiresAt.slice(0, 10) ?? defaultDates.end,
      isActive: coupon?.isActive ?? true,
    },
  });
  const e = formState.errors;
  const type = useWatch({ control, name: "type" });
  const num = (v: unknown) => (v === "" || v === undefined ? undefined : Number(v));

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={handleSubmit((v) => {
        if (adminStore.get().coupons.some((c) => c.code === v.code && c.code !== coupon?.code)) {
          setError("code", { message: "This code already exists" });
          return;
        }
        const next: Coupon = {
          code: v.code,
          type: v.type,
          value: v.type === "fixed" ? Math.round(v.value * 100) : v.value,
          minSubtotal: Math.round(v.minSubtotal * 100),
          maxDiscount: num(v.maxDiscount) !== undefined ? Math.round(num(v.maxDiscount)! * 100) : undefined,
          usageLimit: num(v.usageLimit),
          perCustomerLimit: num(v.perCustomerLimit),
          startsAt: new Date(`${v.startsAt}T00:00:00+05:30`).toISOString(),
          expiresAt: new Date(`${v.expiresAt}T23:59:59+05:30`).toISOString(),
          usedCount: coupon?.usedCount ?? 0,
          isActive,
          showInBag: visibility === "public",
        };
        updateAdmin((d) => {
          const i = d.coupons.findIndex((c) => c.code === coupon?.code);
          if (i >= 0) d.coupons[i] = next;
          else d.coupons.unshift(next);
        });
        toast.success("Coupon saved");
        onDone();
      })}
    >
      <Field label="Code" htmlFor="cp-code" error={e.code?.message}>
        <Input className="uppercase" {...fieldAria("cp-code", e.code?.message)} {...register("code")} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Type" htmlFor="cp-type">
          <Select id="cp-type" {...register("type")}>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </Select>
        </Field>
        <Field label={type === "fixed" ? "Amount ₹" : "Percent %"} htmlFor="cp-value" error={e.value?.message}>
          <Input type="number" min={0} {...fieldAria("cp-value", e.value?.message)} {...register("value")} />
        </Field>
        <Field label="Min. order ₹" htmlFor="cp-min" error={e.minSubtotal?.message}>
          <Input type="number" min={0} {...fieldAria("cp-min", e.minSubtotal?.message)} {...register("minSubtotal")} />
        </Field>
        <Field label="Max. discount ₹" htmlFor="cp-max" optional>
          <Input type="number" min={0} id="cp-max" {...register("maxDiscount")} />
        </Field>
        <Field label="Total uses" htmlFor="cp-limit" optional>
          <Input type="number" min={1} id="cp-limit" {...register("usageLimit")} />
        </Field>
        <Field label="Uses per customer" htmlFor="cp-per" optional>
          <Input type="number" min={1} id="cp-per" {...register("perCustomerLimit")} />
        </Field>
        <Field label="Starts" htmlFor="cp-start" error={e.startsAt?.message}>
          <Input type="date" {...fieldAria("cp-start", e.startsAt?.message)} {...register("startsAt")} />
        </Field>
        <Field label="Ends" htmlFor="cp-end" error={e.expiresAt?.message}>
          <Input type="date" {...fieldAria("cp-end", e.expiresAt?.message)} {...register("expiresAt")} />
        </Field>
      </div>
      <Toggle checked={isActive} onChange={setIsActive} label="Active" />
      <fieldset>
        <legend className="mb-2 text-[0.8rem] font-medium">Who can see it</legend>
        <div role="radiogroup" aria-label="Who can see it" className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "public", icon: Eye, title: "Public", text: "Listed in the bag for every shopper to tap." },
              { id: "private", icon: Lock, title: "Private", text: "Hidden. Works only when someone types the code." },
            ] as const
          ).map(({ id, icon: Icon, title, text }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={visibility === id}
              onClick={() => setVisibility(id)}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-control border p-3 text-left transition-colors",
                visibility === id ? "border-brand bg-brand/5 ring-1 ring-brand" : "border-line-strong hover:border-ink",
              )}
            >
              <span className="flex items-center gap-2 text-[0.9rem] font-medium">
                <Icon className={cn("size-4", visibility === id ? "text-brand" : "text-muted")} />
                {title}
              </span>
              <span className="text-[0.75rem] leading-snug text-muted">{text}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <Button type="submit" className="w-full">
        Save coupon
      </Button>
    </form>
  );
}

/* -------------------------------- Testimonials --------------------------- */
type ReviewDraft = { displayName: string; text: string; rating: string; productName: string; isApproved: boolean };
const blankReview: ReviewDraft = { displayName: "", text: "", rating: "5", productName: "", isApproved: true };

/** Customer reviews for the "From our customers" section of the home page. */
export function TestimonialsAdmin() {
  const { testimonials } = adminStore.useStore();
  // null = closed, "new" = adding, otherwise the id being edited.
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReviewDraft>(blankReview);
  const shown = testimonials.filter((t) => t.isApproved).length;

  const openNew = () => {
    setDraft(blankReview);
    setEditing("new");
  };
  const openEdit = (id: string) => {
    const t = testimonials.find((x) => x.id === id);
    if (!t) return;
    setDraft({
      displayName: t.displayName,
      text: t.text,
      rating: t.rating ? String(t.rating) : "",
      productName: t.productName ?? "",
      isApproved: t.isApproved,
    });
    setEditing(id);
  };

  const save = async () => {
    if (draft.displayName.trim().length < 2) return void toast.error("Add the customer's name");
    if (draft.text.trim().length < 10) return void toast.error("The review needs at least 10 characters");
    const fields = {
      displayName: draft.displayName.trim(),
      text: draft.text.trim(),
      rating: draft.rating ? Number(draft.rating) : undefined,
      productName: draft.productName.trim() || undefined,
      isApproved: draft.isApproved,
    };
    const isNew = editing === "new";
    const ok = await updateAdmin((d) => {
      if (isNew) d.testimonials.unshift({ id: newId("t"), ...fields, isSample: false });
      else {
        const i = d.testimonials.findIndex((t) => t.id === editing);
        if (i >= 0) d.testimonials[i] = { ...d.testimonials[i], ...fields };
      }
    });
    if (!ok) return;
    setEditing(null);
    toast.success(isNew ? "Review added" : "Review saved", {
      description: fields.isApproved ? "It's on the home page now." : "It's hidden. Turn on “Show on home page” to publish it.",
    });
  };

  return (
    <>
      <AdminHeader
        title="Reviews"
        description={`Reviews switched on appear in “From our customers” on the home page${shown ? ` — ${shown} showing now` : ""}.`}
        actions={
          <>
            {shown > 0 && (
              <a
                href="/#reviews-title"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                View on home page
              </a>
            )}
            <Button size="sm" onClick={openNew}>
              <Plus /> Add review
            </Button>
          </>
        }
      />
      {testimonials.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="Add kind words customers have sent you (with their permission). They appear on the home page."
          action={
            <Button onClick={openNew}>
              <Plus /> Add review
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {testimonials.map((t) => (
            <li
              key={t.id}
              className={cn(
                "flex flex-col rounded-card border bg-raised p-5",
                t.isApproved ? "border-line" : "border-dashed border-line-strong",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">{t.displayName}</p>
                  <p className="text-[0.8rem] text-muted">
                    {t.rating ? (
                      <span className="text-accent-ink" aria-label={`Rated ${t.rating} out of 5`}>
                        {"★".repeat(t.rating)}
                        <span className="text-line-strong">{"★".repeat(5 - t.rating)}</span>
                      </span>
                    ) : (
                      "No rating"
                    )}
                    {t.productName && ` · ${t.productName}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {t.isSample && <Badge tone="accent">Sample</Badge>}
                  <Badge tone={t.isApproved ? "success" : "muted"}>{t.isApproved ? "On home page" : "Hidden"}</Badge>
                </div>
              </div>
              <p className="mb-4 mt-3 font-serif text-lg leading-snug">“{t.text}”</p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <Toggle
                  checked={t.isApproved}
                  onChange={(v) => updateAdmin((d) => void (d.testimonials.find((x) => x.id === t.id)!.isApproved = v))}
                  label="Show on home page"
                />
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t.id)} aria-label={`Edit review by ${t.displayName}`}>
                    <Pencil /> Edit
                  </Button>
                  <ConfirmAction
                    trigger={
                      <Button variant="ghost" size="sm" className="text-danger" aria-label={`Delete review by ${t.displayName}`}>
                        <Trash2 /> Delete
                      </Button>
                    }
                    title="Delete this review?"
                    description="It's removed from the home page and can't be brought back. To take it down for now, switch off “Show on home page” instead."
                    confirmLabel="Delete"
                    destructive
                    onConfirm={() => updateAdmin((d) => void (d.testimonials = d.testimonials.filter((x) => x.id !== t.id)))}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Sheet
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing === "new" ? "Add customer review" : "Edit review"}
        description="Only publish reviews you have the customer's permission to use."
      >
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Field label="Customer name" htmlFor="t-name" hint="As the customer agreed, e.g. “Aisha, Srinagar”">
            <Input
              id="t-name"
              value={draft.displayName}
              maxLength={80}
              onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
            />
          </Field>
          <Field label="Review" htmlFor="t-text" hint={`${draft.text.trim().length} / 1200`}>
            <Textarea
              id="t-text"
              rows={5}
              maxLength={1200}
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rating" htmlFor="t-rating" optional>
              <Select id="t-rating" value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: e.target.value })}>
                <option value="">No rating</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {"★".repeat(n)} {n} / 5
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Product" htmlFor="t-product" optional hint="e.g. Gilded Rose Mehndi Basket">
              <Input
                id="t-product"
                value={draft.productName}
                maxLength={120}
                onChange={(e) => setDraft({ ...draft, productName: e.target.value })}
              />
            </Field>
          </div>
          <Toggle checked={draft.isApproved} onChange={(v) => setDraft({ ...draft, isApproved: v })} label="Show on home page" />
          <Button type="submit" className="w-full">
            {editing === "new" ? "Add review" : "Save changes"}
          </Button>
        </form>
      </Sheet>
    </>
  );
}
