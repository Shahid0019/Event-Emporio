"use client";

import Image from "next/image";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { ArrowDown, ArrowUp, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, fieldAria, Input, Select, Textarea } from "@/components/ui/field";
import { Badge, DemoNote } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { customers, DEMO_TODAY, type Customer } from "@/lib/data/admin";
import { demoImage, type DemoImageName } from "@/lib/data/images";
import { adminStore, updateAdmin } from "@/lib/store/admin-store";
import type { Coupon } from "@/lib/types";
import { formatDate, formatPrice, newId } from "@/lib/utils";
import { couponFormSchema } from "@/lib/validations";
import { AdminHeader, ConfirmAction, DataTable, downloadCsv, Panel, Toggle, type Column } from "./admin-ui";

/* --------------------------------- Customers ----------------------------- */
export function CustomersAdmin() {
  const { orders } = adminStore.useStore();
  const stats = (c: Customer) => {
    const mine = orders.filter((o) => o.customer.email === c.email && o.paymentStatus === "paid");
    return { count: mine.length, spent: mine.reduce((s, o) => s + o.totals.total, 0), last: mine[0]?.createdAt };
  };
  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Customer",
      sortValue: (c) => c.name,
      cell: (c) => (
        <span>
          <span className="block font-medium">{c.name}</span>
          <span className="text-[0.78rem] text-muted">{c.email}</span>
        </span>
      ),
    },
    { key: "city", header: "City", sortValue: (c) => c.city, cell: (c) => c.city },
    { key: "orders", header: "Orders", sortValue: (c) => stats(c).count, cell: (c) => stats(c).count },
    {
      key: "spent",
      header: "Total spent",
      sortValue: (c) => stats(c).spent,
      cell: (c) => <span className="tabular-nums">{formatPrice(stats(c).spent)}</span>,
    },
    {
      key: "joined",
      header: "Joined",
      sortValue: (c) => c.joinedAt,
      cell: (c) => <span className="text-muted">{formatDate(c.joinedAt)}</span>,
    },
    {
      key: "marketing",
      header: "Marketing",
      cell: (c) => <Badge tone={c.marketingOptIn ? "success" : "muted"}>{c.marketingOptIn ? "Opted in" : "No"}</Badge>,
    },
  ];
  return (
    <>
      <AdminHeader
        title="Customers"
        description={`${customers.length} registered customers`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv("customers.csv", [
                ["Name", "Email", "City", "Orders", "Spent (INR)"],
                ...customers.map((c) => [c.name, c.email, c.city, stats(c).count, stats(c).spent / 100]),
              ])
            }
          >
            <Download /> Export
          </Button>
        }
      />
      <DataTable
        rows={customers}
        columns={columns}
        rowKey={(c) => c.id}
        searchText={(c) => `${c.name} ${c.email} ${c.phone}`}
        searchPlaceholder="Search name, email or phone"
        initialSort={{ key: "spent", dir: "desc" }}
      />
      <DemoNote className="mt-4">
        Customer exports should be restricted to the owner role and logged — personal data is protected under India&apos;s DPDP Act.
      </DemoNote>
    </>
  );
}

/* ---------------------------------- Coupons ------------------------------ */
type CouponValues = z.input<typeof couponFormSchema>;

export function CouponsAdmin() {
  const { coupons, categories } = adminStore.useStore();
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const state = (c: Coupon) =>
    !c.isActive ? "Disabled" : DEMO_TODAY > new Date(c.expiresAt) ? "Expired" : DEMO_TODAY < new Date(c.startsAt) ? "Scheduled" : "Active";

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
        {editing !== null && (
          <CouponForm coupon={editing === "new" ? undefined : editing} categories={categories} onDone={() => setEditing(null)} />
        )}
      </Sheet>
    </>
  );
}

function CouponForm({ coupon, categories, onDone }: { coupon?: Coupon; categories: { slug: string; name: string }[]; onDone: () => void }) {
  const [isActive, setIsActive] = useState(coupon?.isActive ?? true);
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
      startsAt: (coupon?.startsAt ?? DEMO_TODAY.toISOString()).slice(0, 10),
      expiresAt: (coupon?.expiresAt ?? new Date(DEMO_TODAY.getTime() + 30 * 86_400_000).toISOString()).slice(0, 10),
      categorySlugs: coupon?.categorySlugs ?? [],
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
          categorySlugs: v.categorySlugs.length ? v.categorySlugs : undefined,
          isActive,
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
      <fieldset>
        <legend className="mb-2 text-[0.8rem] font-medium">Limit to categories (optional)</legend>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((c) => (
            <label key={c.slug} className="flex items-center gap-2 text-[0.85rem]">
              <input type="checkbox" value={c.slug} className="size-4 accent-[var(--brand)]" {...register("categorySlugs")} />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>
      <Toggle checked={isActive} onChange={setIsActive} label="Active" />
      <Button type="submit" className="w-full">
        Save coupon
      </Button>
    </form>
  );
}

/* ----------------------------- Homepage & banners ------------------------ */
export function BannersAdmin() {
  const { announcements, hero } = adminStore.useStore();
  const [draftHero, setDraftHero] = useState(hero);
  const [message, setMessage] = useState("");
  const [href, setHref] = useState("");

  return (
    <>
      <AdminHeader title="Homepage & banners" description="Manage the announcement bar and hero without code changes." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Announcement bar">
          <ul className="divide-y divide-line border-y border-line">
            {announcements.map((a, i) => (
              <li key={a.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1 text-[0.88rem]">
                  <p className="truncate">{a.message}</p>
                  {a.href && <p className="text-[0.78rem] text-muted">{a.href}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => updateAdmin((d) => d.announcements.splice(i - 1, 0, d.announcements.splice(i, 1)[0]))}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Move down"
                  disabled={i === announcements.length - 1}
                  onClick={() => updateAdmin((d) => d.announcements.splice(i + 1, 0, d.announcements.splice(i, 1)[0]))}
                >
                  <ArrowDown />
                </Button>
                <Toggle
                  checked={a.isActive}
                  onChange={(v) => updateAdmin((d) => (d.announcements[i].isActive = v))}
                  label={a.isActive ? "Live" : "Off"}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-danger"
                  aria-label="Delete announcement"
                  onClick={() => updateAdmin((d) => d.announcements.splice(i, 1))}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
          <form
            className="mt-5 grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (message.trim().length < 5) return toast.error("Write a message first");
              if (href && !href.startsWith("/")) return toast.error("Links must be site paths, e.g. /shop");
              updateAdmin((d) =>
                d.announcements.push({ id: newId("a"), message: message.trim(), href: href || undefined, isActive: true }),
              );
              setMessage("");
              setHref("");
              toast.success("Announcement added");
            }}
          >
            <Field label="Message" htmlFor="ann-msg">
              <Input id="ann-msg" className="h-10" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={90} />
            </Field>
            <Field label="Link" htmlFor="ann-href" optional>
              <Input id="ann-href" className="h-10" value={href} onChange={(e) => setHref(e.target.value)} placeholder="/shop" />
            </Field>
            <Button type="submit" size="sm" className="h-10">
              Add
            </Button>
          </form>
          <DemoNote className="mt-4">Avoid announcing offers or delivery promises that aren&apos;t configured in settings.</DemoNote>
        </Panel>

        <Panel title="Hero">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              updateAdmin((d) => (d.hero = draftHero));
              toast.success("Hero saved");
            }}
          >
            <Field label="Eyebrow" htmlFor="h-eyebrow">
              <Input id="h-eyebrow" value={draftHero.eyebrow} onChange={(e) => setDraftHero({ ...draftHero, eyebrow: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Headline line 1" htmlFor="h-l1">
                <Input
                  id="h-l1"
                  value={draftHero.titleLines[0]}
                  onChange={(e) => setDraftHero({ ...draftHero, titleLines: [e.target.value, draftHero.titleLines[1]] })}
                />
              </Field>
              <Field label="Headline line 2 (italic)" htmlFor="h-l2">
                <Input
                  id="h-l2"
                  value={draftHero.titleLines[1]}
                  onChange={(e) => setDraftHero({ ...draftHero, titleLines: [draftHero.titleLines[0], e.target.value] })}
                />
              </Field>
            </div>
            <Field label="Description" htmlFor="h-desc">
              <Textarea
                id="h-desc"
                rows={3}
                className="min-h-20"
                value={draftHero.description}
                onChange={(e) => setDraftHero({ ...draftHero, description: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primary button" htmlFor="h-p">
                <Input
                  id="h-p"
                  value={draftHero.primaryCta.label}
                  onChange={(e) => setDraftHero({ ...draftHero, primaryCta: { ...draftHero.primaryCta, label: e.target.value } })}
                />
              </Field>
              <Field label="Primary link" htmlFor="h-ph">
                <Input
                  id="h-ph"
                  value={draftHero.primaryCta.href}
                  onChange={(e) => setDraftHero({ ...draftHero, primaryCta: { ...draftHero.primaryCta, href: e.target.value } })}
                />
              </Field>
              <Field label="Secondary button" htmlFor="h-s">
                <Input
                  id="h-s"
                  value={draftHero.secondaryCta.label}
                  onChange={(e) => setDraftHero({ ...draftHero, secondaryCta: { ...draftHero.secondaryCta, label: e.target.value } })}
                />
              </Field>
              <Field label="Secondary link" htmlFor="h-sh">
                <Input
                  id="h-sh"
                  value={draftHero.secondaryCta.href}
                  onChange={(e) => setDraftHero({ ...draftHero, secondaryCta: { ...draftHero.secondaryCta, href: e.target.value } })}
                />
              </Field>
            </div>
            <div className="rounded-card border border-line bg-canvas p-5">
              <p className="eyebrow text-accent-ink">Preview · {draftHero.eyebrow}</p>
              <p className="mt-2 font-serif text-4xl leading-none">
                {draftHero.titleLines[0]} <em className="text-brand">{draftHero.titleLines[1]}</em>
              </p>
              <p className="mt-3 text-[0.88rem] text-muted">{draftHero.description}</p>
            </div>
            <Button type="submit">Save hero</Button>
          </form>
        </Panel>
      </div>
    </>
  );
}

/* -------------------------------- Testimonials --------------------------- */
export function TestimonialsAdmin() {
  const { testimonials } = adminStore.useStore();
  const [draft, setDraft] = useState({ displayName: "", text: "", rating: "5", productName: "" });
  const [open, setOpen] = useState(false);

  return (
    <>
      <AdminHeader
        title="Testimonials"
        description="Only approved reviews from real customers are shown in the store."
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus /> Add review
          </Button>
        }
      />
      <ul className="grid gap-4 lg:grid-cols-2">
        {testimonials.map((t, i) => (
          <li key={t.id} className="rounded-card border border-line bg-raised p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{t.displayName}</p>
                <p className="text-[0.8rem] text-muted">
                  {t.rating ? `${t.rating}/5` : "No rating"}
                  {t.productName && ` · ${t.productName}`}
                </p>
              </div>
              {t.isSample && <Badge tone="accent">Sample</Badge>}
            </div>
            <p className="mt-3 font-serif text-lg leading-snug">“{t.text}”</p>
            <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-4">
              <Toggle
                checked={t.isApproved}
                onChange={(v) => updateAdmin((d) => (d.testimonials[i].isApproved = v))}
                label={t.isApproved ? "Approved — visible" : "Hidden"}
              />
              <Button variant="ghost" size="sm" className="text-danger" onClick={() => updateAdmin((d) => d.testimonials.splice(i, 1))}>
                <Trash2 /> Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <Sheet open={open} onOpenChange={setOpen} title="Add customer review" description="Only add reviews you have permission to publish.">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.displayName.trim().length < 2 || draft.text.trim().length < 10)
              return toast.error("Name and review text are required");
            updateAdmin((d) =>
              d.testimonials.unshift({
                id: newId("t"),
                displayName: draft.displayName.trim(),
                text: draft.text.trim(),
                rating: draft.rating ? Number(draft.rating) : undefined,
                productName: draft.productName || undefined,
                isSample: false,
                isApproved: false,
              }),
            );
            setDraft({ displayName: "", text: "", rating: "5", productName: "" });
            setOpen(false);
            toast.success("Review added — approve it to publish");
          }}
        >
          <Field label="Display name" htmlFor="t-name" hint="As approved by the customer, e.g. “Aisha, Srinagar”">
            <Input id="t-name" value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} />
          </Field>
          <Field label="Rating" htmlFor="t-rating" optional>
            <Select id="t-rating" value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: e.target.value })}>
              <option value="">No rating</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Product" htmlFor="t-product" optional>
            <Input id="t-product" value={draft.productName} onChange={(e) => setDraft({ ...draft, productName: e.target.value })} />
          </Field>
          <Field label="Review" htmlFor="t-text">
            <Textarea id="t-text" rows={5} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
          </Field>
          <Button type="submit" className="w-full">
            Save review
          </Button>
        </form>
      </Sheet>
    </>
  );
}

/* ---------------------------------- Gallery ------------------------------ */
const galleryLibrary: DemoImageName[] = [
  "mehndi-celebration",
  "mehndi-portrait",
  "gift-candlelight",
  "macarons-stack",
  "brass-tray",
  "rose-basket",
  "candlelit-table",
  "florals-vase",
  "gift-gold-ribbon",
  "chocolates-assorted",
];

export function GalleryAdmin() {
  const { gallery } = adminStore.useStore();
  const [picker, setPicker] = useState(false);
  return (
    <>
      <AdminHeader
        title="Gallery"
        description="Curated images for the homepage Instagram-style section. Manual curation — no scraping."
        actions={
          <Button size="sm" onClick={() => setPicker(true)}>
            <Plus /> Add image
          </Button>
        }
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {gallery.map((g, i) => (
          <li key={g.id} className="overflow-hidden rounded-card border border-line bg-raised">
            <div className="relative aspect-square bg-surface">
              <Image src={g.image.src} alt={g.image.alt} fill sizes="(min-width: 1280px) 20vw, 45vw" className="object-cover" />
            </div>
            <div className="space-y-3 p-3">
              <Field label="Links to" htmlFor={`g-${g.id}`}>
                <Input
                  id={`g-${g.id}`}
                  className="h-9 text-sm"
                  defaultValue={g.href}
                  onBlur={(e) => updateAdmin((d) => (d.gallery[i].href = e.target.value))}
                />
              </Field>
              <div className="flex justify-between">
                <span className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Move earlier"
                    disabled={i === 0}
                    onClick={() => updateAdmin((d) => d.gallery.splice(i - 1, 0, d.gallery.splice(i, 1)[0]))}
                  >
                    <ArrowUp className="-rotate-90" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Move later"
                    disabled={i === gallery.length - 1}
                    onClick={() => updateAdmin((d) => d.gallery.splice(i + 1, 0, d.gallery.splice(i, 1)[0]))}
                  >
                    <ArrowDown className="-rotate-90" />
                  </Button>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-danger"
                  aria-label="Remove image"
                  onClick={() => updateAdmin((d) => d.gallery.splice(i, 1))}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Sheet open={picker} onOpenChange={setPicker} title="Add to gallery" description="Demo image library">
        <ul className="grid grid-cols-3 gap-2">
          {galleryLibrary.map((name) => (
            <li key={name}>
              <button
                type="button"
                aria-label={`Add ${name}`}
                className="relative block aspect-square w-full overflow-hidden rounded-control bg-surface hover:ring-1 hover:ring-ink"
                onClick={() => {
                  updateAdmin((d) => d.gallery.push({ id: newId("g"), image: demoImage(name, name.replace(/-/g, " ")), href: "/shop" }));
                  setPicker(false);
                  toast.success("Image added");
                }}
              >
                <Image src={`/images/demo/${name}.jpg`} alt="" fill sizes="120px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
