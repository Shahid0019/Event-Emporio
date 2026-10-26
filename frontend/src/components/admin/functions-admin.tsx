"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Check, Pencil, PartyPopper, Plus, Sparkles, Trash2 } from "lucide-react";
import { KitThumb } from "@/components/kit/kit-thumb";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { CUSTOM_FUNCTION, FUNCTION_ID_MAX, FUNCTION_TITLE_MAX, type KitFunction } from "@/lib/kit/config";
import { adminStore, updateAdmin, type AdminData } from "@/lib/store/admin-store";
import { cn, slugify } from "@/lib/utils";
import { AdminHeader, ConfirmAction, Panel, Toggle } from "./admin-ui";
import { ImageField } from "./image-upload";

/** Kit products as the function screens need them: item id, name, and which functions suggest them. */
function kitItemsOf(d: AdminData) {
  return d.products
    .filter((p) => p.kit && p.status !== "archived")
    .map((p) => ({ productId: p.id, itemId: p.kit!.itemId, name: p.name, occasions: p.kit!.occasions }));
}

const sorted = (list: KitFunction[]) => [...list].sort((a, b) => a.sortOrder - b.sortOrder);

/* ================================ List =================================== */

export function FunctionsAdmin() {
  const data = adminStore.useStore();
  const functions = sorted(data.kitFunctions);
  const items = kitItemsOf(data);
  const everyday = items.filter((i) => !i.occasions).length;
  const [editing, setEditing] = useState<KitFunction | "new" | null>(null);

  const move = (id: string, dir: -1 | 1) =>
    updateAdmin((d) => {
      const list = sorted(d.kitFunctions);
      const i = list.findIndex((f) => f.id === id);
      const j = i + dir;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      list.forEach((f, n) => (d.kitFunctions.find((x) => x.id === f.id)!.sortOrder = n + 1));
    });

  return (
    <>
      <AdminHeader
        title="Functions"
        description="What customers pick first in the kit builder. Each function gets your everyday items plus the extras you choose for it."
        actions={
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus /> Add function
          </Button>
        }
      />

      {functions.length === 0 ? (
        <EmptyState
          icon={<PartyPopper className="size-6 stroke-[1.25]" />}
          title="No functions yet"
          description="Add the functions you supply for — wazwan, nikkah, mehndi, engagement… Customers can still name their own until you do."
          action={
            <Button onClick={() => setEditing("new")}>
              <Plus /> Add your first function
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {functions.map((f, i) => {
            const extras = items.filter((it) => it.occasions?.includes(f.id));
            return (
              <li
                key={f.id}
                className={cn(
                  "group flex gap-4 rounded-card border bg-raised p-3 pr-2 transition-colors",
                  f.isActive ? "border-line" : "border-dashed border-line-strong bg-raised/60",
                )}
              >
                <button
                  type="button"
                  onClick={() => setEditing(f)}
                  aria-label={`Edit ${f.name}`}
                  className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-control bg-surface"
                >
                  {f.image ? (
                    <Image src={f.image.src} alt="" fill sizes="80px" className="object-cover" />
                  ) : (
                    <KitThumb itemId={f.icon ?? "dastarkhan"} className="absolute inset-0 m-auto w-14 bg-transparent" />
                  )}
                </button>
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(f)}
                      className="font-serif text-[1.35rem] leading-tight hover:text-brand"
                    >
                      {f.name}
                    </button>
                    {!f.isActive && <Badge tone="muted">Hidden</Badge>}
                  </p>
                  <p className="truncate text-[0.82rem] text-muted">{f.description || "Everyday items only"}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {extras.slice(0, 4).map((e) => (
                      <span
                        key={e.itemId}
                        className="inline-flex items-center gap-1 rounded-full bg-surface py-0.5 pl-0.5 pr-2 text-[0.72rem]"
                      >
                        <KitThumb itemId={e.itemId} className="w-5 rounded-full" />
                        {e.name}
                      </span>
                    ))}
                    {extras.length > 4 && <span className="text-[0.72rem] text-muted">+{extras.length - 4} more</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-center justify-center">
                  <IconBtn label={`Move ${f.name} up`} disabled={i === 0} onClick={() => void move(f.id, -1)}>
                    <ArrowUp />
                  </IconBtn>
                  <IconBtn label={`Edit ${f.name}`} onClick={() => setEditing(f)}>
                    <Pencil />
                  </IconBtn>
                  <IconBtn label={`Move ${f.name} down`} disabled={i === functions.length - 1} onClick={() => void move(f.id, 1)}>
                    <ArrowDown />
                  </IconBtn>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <Panel>
          <p className="flex items-center gap-2 text-[0.9rem] font-medium">
            <Check className="size-4 text-success" /> Every function includes {everyday} everyday items
          </p>
          <p className="mt-1 text-[0.82rem] text-muted">
            Dastarkhan, glasses, boxes… Items set to &ldquo;All functions&rdquo; in{" "}
            <Link href="/admin/kit-products" className="underline underline-offset-4 hover:text-ink">
              Kit products
            </Link>
            . Extras like potli are picked per function.
          </p>
        </Panel>
        <Panel>
          <p className="flex items-center gap-2 text-[0.9rem] font-medium">
            <Sparkles className="size-4 text-accent-ink" /> Customers can name their own
          </p>
          <p className="mt-1 text-[0.82rem] text-muted">
            In the kit builder they can pick &ldquo;Your own function&rdquo; and type its name (Aqeeqah, engagement…), or give any function
            their own name, like &ldquo;Sana&rsquo;s Mehndi&rdquo;.
          </p>
        </Panel>
      </div>
      <p className="mt-4 text-[0.82rem] text-muted">The order here is the order customers see in the kit builder and on the home page.</p>

      <Sheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing === "new" ? "New function" : `Edit ${editing?.name ?? "function"}`}
        description="Customers see the name, short line and picture in the kit builder."
      >
        {editing !== null && (
          <FunctionForm
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Sheet>
    </>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-30 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}

/* =============================== Editor ================================== */

function FunctionForm({ initial, onDone }: { initial?: KitFunction; onDone: () => void }) {
  const data = adminStore.useStore();
  const items = kitItemsOf(data);
  const isNew = !initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? items[0]?.itemId ?? "dastarkhan");
  const [image, setImage] = useState(initial?.image);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  // Items that only some functions suggest; the ones ticked here are this function's extras.
  const specific = items.filter((i) => i.occasions);
  const [extras, setExtras] = useState<Set<string>>(
    () => new Set(specific.filter((i) => initial && i.occasions?.includes(initial.id)).map((i) => i.productId)),
  );
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const id = initial?.id ?? slugify(name).slice(0, FUNCTION_ID_MAX).replace(/-+$/, "");

  const save = async () => {
    if (!name.trim()) return setError("Give the function a name customers will recognise.");
    if (isNew && (!id || id === CUSTOM_FUNCTION || data.kitFunctions.some((f) => f.id === id)))
      return setError("Another function already uses this name — try a different one.");
    setError(undefined);
    setSaving(true);
    const next: KitFunction = {
      id,
      name: name.trim(),
      description: description.trim(),
      ...(icon && { icon }),
      ...(image && { image }),
      isActive,
      sortOrder: initial?.sortOrder ?? Math.max(0, ...data.kitFunctions.map((f) => f.sortOrder)) + 1,
    };
    const ok = await updateAdmin((d) => {
      const i = d.kitFunctions.findIndex((f) => f.id === id);
      if (i >= 0) d.kitFunctions[i] = next;
      else d.kitFunctions.push(next);
      // Tick / untick this function on its extras.
      for (const p of d.products) {
        const list = p.kit?.occasions;
        if (!p.kit || !list) continue;
        const want = extras.has(p.id);
        if (want && !list.includes(id)) p.kit.occasions = [...list, id];
        if (!want && list.includes(id)) p.kit.occasions = list.filter((o) => o !== id);
      }
    });
    setSaving(false);
    if (!ok) return;
    toast.success(isNew ? `${next.name} added` : `${next.name} saved`, {
      description: next.isActive ? "Customers can pick it in the kit builder now." : "It's hidden from new kits.",
    });
    onDone();
  };

  const remove = async () => {
    const ok = await updateAdmin((d) => {
      d.kitFunctions = d.kitFunctions.filter((f) => f.id !== initial!.id);
      for (const p of d.products) {
        if (p.kit?.occasions?.includes(initial!.id)) p.kit.occasions = p.kit.occasions.filter((o) => o !== initial!.id);
      }
    });
    if (ok) {
      toast(`${initial!.name} deleted`);
      onDone();
    }
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Field
        label="Name"
        htmlFor="fn-name"
        error={error}
        hint={isNew && id ? `Link: /kit?occasion=${id}` : initial ? `Link: /kit?occasion=${initial.id}` : undefined}
      >
        <Input
          id="fn-name"
          data-autofocus
          value={name}
          maxLength={FUNCTION_TITLE_MAX}
          placeholder="e.g. Engagement"
          onChange={(e) => setName(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
      </Field>
      <Field label="Short line" htmlFor="fn-desc" optional hint="Under the name, e.g. “Main wedding feast” or “Adds potli”">
        <Input id="fn-desc" value={description} maxLength={80} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <fieldset>
        <legend className="mb-2 text-[0.85rem] font-medium">Picture in the kit builder</legend>
        <div role="radiogroup" aria-label="Picture" className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
          {items.map((it) => (
            <button
              key={it.itemId}
              type="button"
              role="radio"
              aria-checked={icon === it.itemId}
              aria-label={it.name}
              title={it.name}
              onClick={() => setIcon(it.itemId)}
              className="rounded-control border-2 border-transparent p-0.5 transition-colors hover:border-line-strong aria-checked:border-brand"
            >
              <KitThumb itemId={it.itemId} className="w-full" />
            </button>
          ))}
        </div>
      </fieldset>

      <ImageField
        id="fn-image"
        label="Photo for the home page (optional)"
        value={image}
        onChange={setImage}
        folder="kit-functions"
        hint="Shown on the “Which function is it for?” cards. Without one, the picture above is used."
      />

      <fieldset>
        <legend className="mb-1 text-[0.85rem] font-medium">Extras this function adds</legend>
        <p className="mb-3 text-[0.78rem] text-muted">
          Everyday items are always in. Tick the function-only items it should suggest — customers can still add anything by hand.
        </p>
        {specific.length === 0 ? (
          <p className="rounded-control bg-surface p-3 text-[0.82rem] text-muted">
            No function-only items yet. In{" "}
            <Link href="/admin/kit-products" className="underline underline-offset-4">
              Kit products
            </Link>
            , pick functions on an item (instead of &ldquo;All functions&rdquo;) to make it an extra.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {specific.map((it) => {
              const on = extras.has(it.productId);
              return (
                <button
                  key={it.productId}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() =>
                    setExtras((s) => {
                      const n = new Set(s);
                      if (on) n.delete(it.productId);
                      else n.add(it.productId);
                      return n;
                    })
                  }
                  className={cn(
                    "flex items-center gap-3 rounded-control border p-2 text-left text-[0.88rem] transition-colors",
                    on ? "border-brand bg-brand/5" : "border-line-strong hover:border-ink",
                  )}
                >
                  <KitThumb itemId={it.itemId} className="w-8" />
                  <span className="min-w-0 flex-1 truncate">{it.name}</span>
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border",
                      on ? "border-brand bg-brand text-brand-ink" : "border-line-strong",
                    )}
                  >
                    {on && <Check className="size-3" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      <div className="rounded-control border border-line p-4">
        <Toggle
          checked={isActive}
          onChange={setIsActive}
          label="Offer in the kit builder"
          description={isActive ? "Customers can pick it." : "Hidden from new kits; kits that already use it keep working."}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        {initial ? (
          <ConfirmAction
            trigger={
              <Button type="button" variant="ghost" size="sm" className="text-danger">
                <Trash2 /> Delete
              </Button>
            }
            title={`Delete ${initial.name}?`}
            description="Customers can't pick it any more and its extras stop being suggested for it. Kits already in bags and orders keep their items. To pause it, turn off “Offer in the kit builder” instead."
            confirmLabel="Delete"
            destructive
            onConfirm={() => void remove()}
          />
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={saving}>
            <Check /> {isNew ? "Add function" : "Save"}
          </Button>
        </div>
      </div>
      {initial && (
        <Link
          href={`/kit?occasion=${initial.id}`}
          target="_blank"
          className={buttonVariants({ variant: "link", className: "text-[0.72rem]" })}
        >
          Try it in the kit builder
        </Link>
      )}
    </form>
  );
}
