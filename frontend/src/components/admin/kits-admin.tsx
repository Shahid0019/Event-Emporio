"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Copy, Eye, Link2, MessageCircle, Pencil, Plus, RotateCcw, Save, Settings2, Sparkles, Trash2, X } from "lucide-react";
import { AdminHeader, ConfirmAction, DataTable, Panel, Toggle, type Column } from "@/components/admin/admin-ui";
import { AddItemsSheet } from "@/components/kit/kit-add-items";
import { KitThumb } from "@/components/kit/kit-panel";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/primitives";
import { blankAdminKit, toSharedKit, whatsappNumber, type AdminKit } from "@/lib/kit/admin-kits";
import {
  activeLines,
  baseQuantity,
  budgetFor,
  buildKit,
  KIT_ADDITIONS_MAX,
  kitTotal,
  variantsInKit,
  withoutVariantOverrides,
  type KitAddition,
  type KitPrefs,
} from "@/lib/kit/buildKit";
import { kitItemById } from "@/lib/kit/catalog";
import {
  CUSTOM_FUNCTION,
  FUNCTION_TITLE_MAX,
  functionDates,
  KIT_MAX_PER_ORDER,
  kitCategories,
  TRAMI,
  tiers,
  type Occasion,
} from "@/lib/kit/config";
import { formatKitAmount, formatUnitPrice, quantityHint } from "@/lib/kit/format";
import { SHARED_NAME_MAX, SHARED_NOTE_MAX, sharedKitPath } from "@/lib/kit/shared";
import { kitTitle, occasionName, tierName } from "@/lib/kit/url";
import { siteUrl } from "@/lib/site";
import { adminStore, updateAdmin } from "@/lib/store/admin-store";
import { cn, formatDate, newId } from "@/lib/utils";

/**
 * The shop's functions (from Admin → Functions) as cards, plus "Customer's own"
 * for customer kits. A hidden function stays visible here while a kit uses it.
 */
function FunctionPicker({ value, onChange }: { value: Occasion; onChange: (id: Occasion) => void }) {
  const functions = adminStore
    .useStore((d) => d.kitFunctions)
    .filter((f) => f.isActive || f.id === value)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const card =
    "flex min-h-16 items-center gap-3 rounded-control border p-2.5 text-left transition-colors hover:border-ink aria-pressed:border-brand aria-pressed:bg-brand/5 aria-pressed:ring-1 aria-pressed:ring-brand";

  return (
    <div role="group" aria-label="Function" className="grid grid-cols-1 gap-2 min-[30rem]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {functions.map((f) => (
        <button
          key={f.id}
          type="button"
          aria-pressed={value === f.id}
          onClick={() => onChange(f.id)}
          className={cn(card, "border-line-strong")}
        >
          <KitThumb itemId={f.icon ?? "dastarkhan"} className="w-9" />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-[0.92rem] font-medium">
              <span className="truncate">{f.name}</span>
              {!f.isActive && <Badge tone="muted">Hidden</Badge>}
            </span>
            <span className="block truncate text-[0.74rem] text-muted">{f.description || "Everyday items"}</span>
          </span>
        </button>
      ))}
      <button
        type="button"
        aria-pressed={value === CUSTOM_FUNCTION}
        onClick={() => onChange(CUSTOM_FUNCTION)}
        className={cn(card, "border-dashed border-line-strong aria-pressed:border-solid")}
      >
        <span className="grid aspect-[4/5] w-9 shrink-0 place-items-center rounded-chip bg-accent-soft text-accent-ink">
          <Sparkles className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-[0.92rem] font-medium">Customer&apos;s own</span>
          <span className="block truncate text-[0.74rem] text-muted">Name it below</span>
        </span>
      </button>
    </div>
  );
}

/** Saves a customer kit to the database; returns its id, or null if the save failed. */
async function saveKit(kit: AdminKit, status?: AdminKit["status"]): Promise<string | null> {
  const id = kit.id || newId("kit");
  const now = new Date().toISOString();
  const ok = await updateAdmin((d) => {
    const existing = d.customerKits.find((k) => k.id === id);
    const next: AdminKit = {
      ...kit,
      id,
      status: status ?? existing?.status ?? kit.status,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existing) Object.assign(existing, next);
    else d.customerKits.unshift(next);
  });
  return ok ? id : null;
}

const linesOf = (k: Pick<AdminKit, "occasion" | "trami" | "tier" | "prefs" | "overrides" | "added">) =>
  buildKit({ occasion: k.occasion, trami: k.trami, tier: k.tier, prefs: k.prefs, overrides: k.overrides, added: k.added });
const functionLabel = (k: AdminKit) => `${kitTitle(k)} · ${k.trami} trami · ${tierName(k.tier)}`;

const noop = () => () => {};
/** The current site origin, so copied links point at whichever host the admin is using. */
const useOrigin = () =>
  useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => siteUrl,
  );
const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

function customerMessage(k: AdminKit, url: string) {
  const total = formatKitAmount(kitTotal(linesOf(k)));
  const hello = k.customerName ? `Hello ${k.customerName}!` : "Hello!";
  return `${hello} Events Emporio has put together a kit for your ${kitTitle(k)}: ${k.trami} trami, ${total} in total.\nTake a look, change anything you like and order here: ${url}`;
}

function whatsappHref(k: AdminKit, url: string) {
  return `https://wa.me/${whatsappNumber(k.customerPhone)}?text=${encodeURIComponent(customerMessage(k, url))}`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* ================================ List =================================== */

export function KitsAdmin() {
  const kits = adminStore.useStore((d) => d.customerKits);
  const origin = useOrigin();
  const router = useRouter();

  const columns: Column<AdminKit>[] = [
    {
      key: "customer",
      header: "Customer",
      sortValue: (k) => k.customerName,
      cell: (k) => (
        <Link href={`/admin/kits/${k.id}`} className="block hover:text-brand">
          <span className="block font-medium">{k.customerName || "Unnamed customer"}</span>
          {k.customerPhone && <span className="block text-[0.8rem] text-muted">{k.customerPhone}</span>}
        </Link>
      ),
    },
    { key: "function", header: "Function", cell: (k) => <span className="text-[0.88rem]">{functionLabel(k)}</span> },
    {
      key: "total",
      header: "Total",
      className: "text-right tabular-nums",
      sortValue: (k) => kitTotal(linesOf(k)),
      cell: (k) => (
        <span>
          <span className="block font-medium">{formatKitAmount(kitTotal(linesOf(k)))}</span>
          <span className="block text-[0.78rem] text-muted">{activeLines(linesOf(k)).length} items</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (k) => k.status,
      cell: (k) => <Badge tone={k.status === "sent" ? "success" : "muted"}>{k.status === "sent" ? "Sent" : "Draft"}</Badge>,
    },
    {
      key: "updated",
      header: "Updated",
      sortValue: (k) => k.updatedAt,
      cell: (k) => <span className="text-[0.82rem] text-muted">{formatDate(k.updatedAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (k) => (
        <span className="inline-flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Copy link for ${k.customerName || "kit"}`}
            onClick={async () => {
              const ok = await copyText(`${origin}${sharedKitPath(toSharedKit(k))}`);
              if (ok) void saveKit(k, "sent");
              toast[ok ? "success" : "error"](ok ? "Customer link copied" : "Couldn't copy — open the kit and copy the link there");
            }}
          >
            <Link2 />
          </Button>
          <Link
            href={`/admin/kits/${k.id}`}
            aria-label={`Edit kit for ${k.customerName || "customer"}`}
            className={buttonVariants({ variant: "ghost", size: "icon", className: "size-8" })}
          >
            <Pencil />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Duplicate kit for ${k.customerName || "customer"}`}
            onClick={async () => {
              const id = await saveKit({ ...k, id: "", status: "draft", customerName: k.customerName ? `${k.customerName} (copy)` : "" });
              if (id) router.push(`/admin/kits/${id}`);
            }}
          >
            <Copy />
          </Button>
          <ConfirmAction
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-danger"
                aria-label={`Delete kit for ${k.customerName || "customer"}`}
              >
                <Trash2 />
              </Button>
            }
            title="Delete this kit?"
            description="Links you already sent keep working — the kit travels inside the link — but it disappears from this list."
            confirmLabel="Delete"
            destructive
            onConfirm={async () => {
              if (await updateAdmin((d) => void (d.customerKits = d.customerKits.filter((x) => x.id !== k.id)))) toast("Kit deleted");
            }}
          />
        </span>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Customer kits"
        description="Build a complete function kit for a customer and send it as a link. They open it, adjust anything, and add it to their cart."
        actions={
          <Link href="/admin/kits/new" className={buttonVariants({ size: "sm" })}>
            <Plus /> Create kit
          </Link>
        }
      />
      <DataTable
        rows={kits}
        columns={columns}
        rowKey={(k) => k.id}
        searchText={(k) => `${k.customerName} ${k.customerPhone} ${functionLabel(k)}`}
        searchPlaceholder="Search customer, phone or function…"
        empty="No kits yet — create one for a customer."
        initialSort={{ key: "updated", dir: "desc" }}
      />
      <p className="mt-6 text-[0.85rem] text-muted">
        Item ratios, options and prices are managed in{" "}
        <Link href="/admin/kit-products" className="font-medium text-ink underline underline-offset-4 hover:text-brand">
          Kit products
        </Link>
        .
      </p>
    </>
  );
}

/* =============================== Editor ================================== */

/** Waits for the browser copy of the kits before deciding whether an id exists. */
export function KitEditorPage({ kitId }: { kitId?: string }) {
  const kits = adminStore.useStore((d) => d.customerKits);
  const hydrated = useHydrated();
  if (!kitId) return <KitEditor initial={blankAdminKit()} />;
  if (!hydrated) return <p className="text-muted">Loading kit…</p>;
  const kit = kits.find((k) => k.id === kitId);
  if (!kit) {
    return (
      <>
        <AdminHeader title="Kit not found" back={{ href: "/admin/kits", label: "Customer kits" }} />
        <p className="text-muted">
          This kit isn&apos;t saved in this browser. Kits live in the browser that created them until the backend is connected.
        </p>
      </>
    );
  }
  return <KitEditor key={kit.id} initial={kit} />;
}

function KitEditor({ initial }: { initial: AdminKit }) {
  const router = useRouter();
  const origin = useOrigin();
  const [draft, setDraft] = useState<AdminKit>(initial);
  const [nameError, setNameError] = useState<string | undefined>();
  const isNew = !initial.id;

  const lines = linesOf(draft);
  const active = activeLines(lines);
  const total = kitTotal(lines);
  const budget = budgetFor(draft.tier, { occasion: draft.occasion, trami: draft.trami, prefs: draft.prefs });
  const url = `${origin}${sharedKitPath(toSharedKit(draft))}`;

  const update = (patch: Partial<AdminKit>) => setDraft((d) => ({ ...d, ...patch }));

  /** Saves the draft (new kits get an id and their own URL). Returns false if the form isn't valid. */
  const valid = () => {
    if (!draft.customerName.trim()) {
      setNameError("Add the customer's name — it's shown to them in the chat.");
      document.getElementById("kit-customer-name")?.focus();
      return false;
    }
    setNameError(undefined);
    if (draft.occasion === CUSTOM_FUNCTION && !draft.title?.trim()) {
      toast.error("Name the customer's function", { description: "Their own function needs a name, e.g. Aqeeqah." });
      document.getElementById("kit-function-title")?.focus();
      return false;
    }
    return true;
  };

  /** Saves the draft (new kits get an id and their own page). Resolves false if invalid or not saved. */
  const save = async (status?: AdminKit["status"]): Promise<boolean> => {
    if (!valid()) return false;
    const id = await saveKit(
      { ...draft, customerName: draft.customerName.trim(), note: draft.note.trim(), title: draft.title?.trim() || undefined },
      status,
    );
    if (!id) return false;
    if (isNew) router.replace(`/admin/kits/${id}`);
    else setDraft((d) => ({ ...d, status: status ?? d.status }));
    return true;
  };

  return (
    <>
      <AdminHeader
        title={isNew ? "New customer kit" : `Kit for ${initial.customerName || "customer"}`}
        description="Pick the function, then fine-tune any item. The customer gets this exact kit and can still change it."
        back={{ href: "/admin/kits", label: "Customer kits" }}
        actions={
          <Button
            size="sm"
            onClick={async () => {
              if (await save()) toast.success(isNew ? "Kit created" : "Kit saved");
            }}
          >
            <Save /> {isNew ? "Create kit" : "Save"}
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-6">
          <Panel title="Customer">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name" htmlFor="kit-customer-name" error={nameError}>
                <Input
                  id="kit-customer-name"
                  value={draft.customerName}
                  maxLength={SHARED_NAME_MAX}
                  onChange={(e) => update({ customerName: e.target.value })}
                  aria-invalid={nameError ? true : undefined}
                />
              </Field>
              <Field label="WhatsApp number" htmlFor="kit-customer-phone" optional hint="10-digit numbers get +91">
                <Input
                  id="kit-customer-phone"
                  type="tel"
                  inputMode="tel"
                  value={draft.customerPhone}
                  onChange={(e) => update({ customerPhone: e.target.value })}
                />
              </Field>
              <Field
                label="Message to the customer"
                htmlFor="kit-note"
                optional
                className="sm:col-span-2"
                hint={`${draft.note.length}/${SHARED_NOTE_MAX} · shown in their chat`}
              >
                <Textarea
                  id="kit-note"
                  rows={2}
                  maxLength={SHARED_NOTE_MAX}
                  value={draft.note}
                  onChange={(e) => update({ note: e.target.value })}
                />
              </Field>
            </div>
          </Panel>

          <KitSetupPanels draft={draft} setDraft={setDraft} />
        </div>

        <aside className="h-fit space-y-4 xl:sticky xl:top-20">
          <Panel title="Summary">
            <p className="text-[2rem] font-medium leading-none tabular-nums">{formatKitAmount(total)}</p>
            <p className="mt-2 text-[0.85rem] text-muted">
              {active.length} items · {formatKitAmount(total / draft.trami)} per trami
            </p>
            <p className={cn("mt-1 text-[0.85rem]", total <= budget ? "text-success" : "text-danger")}>
              {total <= budget ? "Within" : "Over"} the {tierName(draft.tier)} budget of {formatKitAmount(budget)}
            </p>

            <div className="mt-5 space-y-2">
              <Button
                className="w-full"
                onClick={async () => {
                  if (!(await save("sent"))) return;
                  const ok = await copyText(url);
                  toast[ok ? "success" : "error"](
                    ok ? "Link copied — paste it to the customer" : "Couldn't copy — select the link below and copy it",
                  );
                }}
              >
                <Link2 /> Copy customer link
              </Button>
              <a
                href={whatsappHref(draft, url)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!valid()) e.preventDefault();
                  else void save("sent");
                }}
                className={buttonVariants({ variant: "outline", className: "w-full" })}
              >
                <MessageCircle /> Send on WhatsApp
              </a>
              <a href={url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost", className: "w-full" })}>
                <Eye /> Preview as customer
              </a>
            </div>

            <Field
              label="Customer link"
              htmlFor="kit-link"
              className="mt-5"
              hint="The whole kit is inside the link — it works on any phone."
            >
              <Input id="kit-link" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="text-[0.78rem]" />
            </Field>
          </Panel>
          {!isNew && (
            <p className="px-1 text-[0.78rem] text-muted">
              {draft.status === "sent" ? "Sent" : "Draft"} · created {formatDate(initial.createdAt)}
            </p>
          )}
        </aside>
      </div>
    </>
  );
}

/* ----------------------- Shared: function + items ------------------------ */

/** The parts every customer kit has. */
export interface KitSetup {
  occasion: Occasion;
  /** The customer's own name for the function (customer kits only). */
  title?: string;
  trami: number;
  tier: AdminKit["tier"];
  prefs: KitPrefs;
  overrides: AdminKit["overrides"];
  added?: KitAddition[];
  date?: AdminKit["date"];
}

/** "Function" (occasion, trami, tier, preferences) and the item-by-item table. */
export function KitSetupPanels<K extends KitSetup>({
  draft,
  setDraft,
}: {
  draft: K;
  setDraft: React.Dispatch<React.SetStateAction<K>>;
}) {
  const lines = linesOf(draft);
  const active = activeLines(lines);
  const update = (patch: Partial<KitSetup>) => setDraft((d) => ({ ...d, ...patch }) as K);
  const patchItem = (itemId: string, patch: AdminKit["overrides"][string]) =>
    setDraft((d) => ({ ...d, overrides: { ...d.overrides, [itemId]: { ...d.overrides[itemId], ...patch } } }));
  const patchAddition = (id: string, patch: Partial<KitAddition>) =>
    setDraft((d) => ({ ...d, added: (d.added ?? []).map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  const removeAddition = (id: string) => setDraft((d) => ({ ...d, added: (d.added ?? []).filter((a) => a.id !== id) }));
  const [adding, setAdding] = useState(false);

  /** Adds an item in a type; an exact repeat opens nothing new, and a removed suggested item is simply put back. */
  const addItem = (itemId: string, variantIndex: number, label: string): boolean => {
    const item = kitItemById(itemId);
    if (!item) return false;
    if (lines.some((l) => l.itemId === itemId && l.variantIndex === variantIndex && !l.removed)) {
      toast(`${label} is already in this kit`, { description: "Change its quantity in the table instead." });
      return false;
    }
    const suggested = lines.find((l) => !l.additionId && l.itemId === itemId);
    if (suggested?.removed) {
      patchItem(itemId, { removed: false, variantIndex });
      toast.success(`${label} is back in the kit`);
      return true;
    }
    if ((draft.added?.length ?? 0) >= KIT_ADDITIONS_MAX) {
      toast.error(`A kit can have up to ${KIT_ADDITIONS_MAX} added items.`);
      return false;
    }
    const line: KitAddition = {
      id: `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      itemId,
      variantIndex,
      qty: baseQuantity(draft.trami, item.perTrami, draft.prefs.extra),
    };
    setDraft((d) => ({ ...d, added: [...(d.added ?? []), line] }));
    toast.success(`${label} added`, { description: "Set its quantity in the table." });
    return true;
  };

  return (
    <>
      <Panel
        title="Function"
        action={
          <Link href="/admin/functions" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <Settings2 /> Manage functions
          </Link>
        }
      >
        <div className="space-y-6">
          <FunctionPicker value={draft.occasion} onChange={(occasion) => update({ occasion })} />
          <Field
            label={draft.occasion === CUSTOM_FUNCTION ? "Name of their function" : "Name for this function"}
            htmlFor="kit-function-title"
            optional={draft.occasion !== CUSTOM_FUNCTION}
            hint={
              draft.occasion === CUSTOM_FUNCTION
                ? "Their own function gets every everyday item — add any extras below."
                : "Shown to the customer instead of the function's name, e.g. Sana's Mehndi."
            }
          >
            <Input
              id="kit-function-title"
              value={draft.title ?? ""}
              maxLength={FUNCTION_TITLE_MAX}
              placeholder={
                draft.occasion === CUSTOM_FUNCTION ? "e.g. Aqeeqah, Engagement" : `e.g. Sana ki ${occasionName(draft.occasion)}`
              }
              onChange={(e) => update({ title: e.target.value })}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Trami" htmlFor="kit-trami" hint={`≈ ${draft.trami * 4} guests`}>
              <Input
                id="kit-trami"
                type="number"
                min={TRAMI.min}
                max={TRAMI.max}
                value={draft.trami}
                onChange={(e) => {
                  const n = Math.round(Number(e.target.value));
                  if (n >= TRAMI.min && n <= TRAMI.max) update({ trami: n });
                }}
              />
            </Field>
            <Field label="Function date" htmlFor="kit-date">
              <Select
                id="kit-date"
                value={("date" in draft ? draft.date : null) ?? ""}
                onChange={(e) => update({ date: functionDates.find((d) => d.id === e.target.value)?.id ?? null })}
              >
                <option value="">Not set</option>
                {functionDates.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div>
            <p className="mb-2 text-[0.85rem] font-medium">Tier</p>
            <div role="group" aria-label="Tier" className="grid grid-cols-3 gap-2">
              {tiers.map((t) => {
                const tierTotal = kitTotal(buildKit({ occasion: draft.occasion, trami: draft.trami, tier: t.id, prefs: draft.prefs }));
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={draft.tier === t.id}
                    onClick={() => setDraft((d) => ({ ...d, tier: t.id, overrides: withoutVariantOverrides(d.overrides) }))}
                    className="rounded-control border border-line-strong p-3 text-left transition-colors hover:border-ink aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-ink"
                  >
                    <span className="block text-[0.72rem] font-medium uppercase tracking-[0.12em]">{t.name}</span>
                    <span className="mt-1 block font-medium tabular-nums">{formatKitAmount(tierTotal)}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[0.78rem] text-muted">
              Changing the tier or preferences resets item options to that tier&apos;s defaults.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                ["bio", "Bio / eco items"],
                ["printed", "Printed names"],
                ["extra", "Extra 10% stock"],
              ] as [keyof KitPrefs, string][]
            ).map(([key, label]) => (
              <Toggle
                key={key}
                label={label}
                checked={draft.prefs[key]}
                onChange={(v) =>
                  setDraft((d) => ({ ...d, prefs: { ...d.prefs, [key]: v }, overrides: withoutVariantOverrides(d.overrides) }))
                }
              />
            ))}
          </div>
        </div>
      </Panel>

      <Panel
        title={`Items · ${active.length} of ${lines.length}`}
        bodyClassName="p-0"
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus /> Add items
          </Button>
        }
      >
        <AddItemsSheet open={adding} onOpenChange={setAdding} lines={lines} onAdd={addItem} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-[0.88rem]">
            <thead className="bg-surface/60 text-left text-[0.72rem] uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="w-12 px-5 py-2.5 font-medium">
                  <span className="sr-only">Include</span>
                </th>
                <th className="py-2.5 pr-3 font-medium">Item</th>
                <th className="px-3 py-2.5 font-medium">Option</th>
                <th className="px-3 py-2.5 font-medium">Quantity</th>
                <th className="px-5 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            {kitCategories.map((cat) => {
              const inCat = lines.filter((l) => l.category === cat.id);
              // Added types sit right under the item they belong to.
              const firstIndex = (itemId: string) => inCat.findIndex((l) => l.itemId === itemId);
              const rows = [...inCat].sort((x, y) => firstIndex(x.itemId) - firstIndex(y.itemId));
              if (!rows.length) return null;
              return (
                <tbody key={cat.id} className="divide-y divide-line border-t border-line">
                  <tr>
                    <th
                      colSpan={5}
                      scope="colgroup"
                      className="bg-canvas px-5 pb-1 pt-3 text-left text-[0.7rem] font-medium uppercase tracking-[0.16em] text-accent-ink"
                    >
                      {cat.label}
                    </th>
                  </tr>
                  {rows.map((line) => {
                    const item = kitItemById(line.itemId);
                    if (!item) return null;
                    const added = line.additionId;
                    const variantName = item.variants[line.variantIndex]?.name ?? "";
                    // Types already on another line of this item can't be picked twice.
                    const taken = variantsInKit(
                      lines.filter((l) => l.lineId !== line.lineId),
                      line.itemId,
                    );
                    return (
                      <tr key={line.lineId} className={cn(line.removed && "bg-surface/40 text-muted", added && "bg-accent-soft/15")}>
                        <td className="px-5 py-2.5">
                          {added ? (
                            <button
                              type="button"
                              onClick={() => removeAddition(added)}
                              aria-label={`Remove ${line.name} ${variantName}`}
                              title="Remove this added item"
                              className="-ml-1.5 grid size-7 place-items-center rounded-full text-muted hover:bg-danger/10 hover:text-danger"
                            >
                              <X className="size-4" />
                            </button>
                          ) : (
                            <input
                              type="checkbox"
                              checked={!line.removed}
                              onChange={(e) => patchItem(line.itemId, { removed: !e.target.checked })}
                              aria-label={`Include ${line.name}`}
                              className="size-4 accent-[var(--brand)]"
                            />
                          )}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className={cn("flex items-center gap-3", line.removed && "opacity-50")}>
                            <KitThumb itemId={line.itemId} variantIndex={line.variantIndex} className="w-9" />
                            <span>
                              <span className="flex items-center gap-2 font-medium text-ink">
                                {line.name}
                                {added && <Badge tone="accent">Added</Badge>}
                              </span>
                              <span className="block text-[0.75rem] text-muted">
                                {quantityHint(draft.trami, item.perTrami, draft.prefs.extra)}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <Select
                            aria-label={`${line.name} option${added ? ` (added ${variantName})` : ""}`}
                            value={line.variantIndex}
                            disabled={line.removed}
                            onChange={(e) =>
                              added
                                ? patchAddition(added, { variantIndex: Number(e.target.value) })
                                : patchItem(line.itemId, { variantIndex: Number(e.target.value) })
                            }
                            className="h-10 min-w-36 text-[0.85rem]"
                          >
                            {item.variants.map((v, i) => (
                              <option key={v.name} value={i} disabled={taken.has(i)}>
                                {v.name} · {formatUnitPrice(v.price)}
                                {taken.has(i) ? " · in kit" : ""}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="flex items-center gap-2">
                            <QtyInput
                              label={`Quantity for ${line.name}${added ? ` ${variantName}` : ""}`}
                              value={line.qty}
                              disabled={line.removed}
                              onCommit={(qty) => (added ? patchAddition(added, { qty }) : patchItem(line.itemId, { qty }))}
                            />
                            {!added && line.qty !== line.baseQty && !line.removed && (
                              <button
                                type="button"
                                onClick={() => patchItem(line.itemId, { qty: undefined })}
                                aria-label={`Reset ${line.name} to ${line.baseQty}`}
                                title={`Reset to suggested ${line.baseQty}`}
                                className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink"
                              >
                                <RotateCcw className="size-3.5" />
                              </button>
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-right tabular-nums">
                          <span className="block font-medium text-ink">{formatKitAmount(line.lineTotal)}</span>
                          <span className="block text-[0.75rem] text-muted">{formatUnitPrice(line.unitPrice)} each</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              );
            })}
          </table>
        </div>
      </Panel>
    </>
  );
}

/** Number input that lets staff clear and retype freely; commits whole numbers ≥ 1. */
function QtyInput({
  label,
  value,
  disabled,
  onCommit,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onCommit: (qty: number) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  return (
    <Input
      type="number"
      min={1}
      max={KIT_MAX_PER_ORDER}
      aria-label={label}
      disabled={disabled}
      value={text ?? String(value)}
      onFocus={() => setText(String(value))}
      onBlur={() => setText(null)}
      onChange={(e) => {
        setText(e.target.value);
        const n = Math.round(Number(e.target.value));
        if (e.target.value !== "" && n >= 1 && n <= KIT_MAX_PER_ORDER) onCommit(n);
      }}
      className="h-10 w-24 tabular-nums"
    />
  );
}
