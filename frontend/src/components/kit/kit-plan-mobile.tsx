"use client";

import { useState } from "react";
import { ArrowRight, Check, Gift, Pencil, Plus, RotateCcw, Share2, ShoppingBasket, Sparkles, Users, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNumberField } from "@/components/ui/quantity-selector";
import { useStoreSettings } from "@/components/providers/store-data";
import { activeKitFunctions, getKitCatalog } from "@/lib/kit/catalog";
import { CUSTOM_FUNCTION, FUNCTION_TITLE_MAX, GUESTS_PER_TRAMI, TRAMI, tiers, type Occasion } from "@/lib/kit/config";
import { createShoppingList, guestsOf, MAX_GUESTS, openGiftSheet, queryOf, setTier, startOver } from "@/lib/kit/store";
import { cleanTitle, kitQueryString, kitTitle, shareText } from "@/lib/kit/url";
import { siteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";
import { KitPanel } from "./kit-panel";
import { SavedKitsButton } from "./saved-kits";
import { KitThumb } from "./kit-thumb";
import { useKit } from "./use-kit";

const chipBtn =
  "inline-flex h-9 items-center gap-1.5 rounded-control border border-line-strong px-3 text-sm transition-colors aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-ink";


/**
 * Phones follow the handbook's mobile flow: one Plan My Function screen
 * (function + guests or tramies), then the function's shopping list.
 * Larger screens keep the chat beside the kit.
 */
export function MobilePlanner() {
  const { state } = useKit();
  const [editing, setEditing] = useState(false);
  const planned = state.occasion !== null && state.furthest >= 5;

  // Keyed by the saved function: a link such as /kit?occasion=wazwan can set it just after the form appears
  // (arriving from the home page), and the form should then start from that choice.
  if (!planned || editing)
    return <PlanForm key={state.occasion ?? "none"} onDone={() => setEditing(false)} onCancel={planned ? () => setEditing(false) : undefined} />;
  return <ShoppingList onEdit={() => setEditing(true)} />;
}

/* ------------------------------ Screen 04 ------------------------------ */

function PlanForm({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const { state } = useKit();
  const functions = activeKitFunctions();
  const [occasion, setOccasion] = useState<Occasion | null>(state.occasion);
  const [own, setOwn] = useState(state.occasion === CUSTOM_FUNCTION);
  const [name, setName] = useState(state.title ?? "");
  // Tramies first: that is how families count a Kashmiri feast. Guests stay one tap away.
  const [by, setBy] = useState<"guests" | "trami">(state.countBy ?? "trami");
  const [guests, setGuestsLocal] = useState(guestsOf(state));
  const [trami, setTramiLocal] = useState(state.trami);
  const [tried, setTried] = useState(false);

  const value = by === "guests" ? guests : trami;
  const field = useNumberField({
    value,
    onChange: by === "guests" ? setGuestsLocal : setTramiLocal,
    min: by === "guests" ? 1 : TRAMI.min,
    max: by === "guests" ? MAX_GUESTS : TRAMI.max,
  });
  const step = by === "guests" ? 10 : 5;
  const needsName = own && !cleanTitle(name);
  const ready = (occasion !== null || own) && !needsName;

  const switchBy = (next: "guests" | "trami") => {
    if (next === by) return;
    // Keep the size: 400 guests ↔ 100 tramies.
    if (next === "trami") setTramiLocal(Math.max(TRAMI.min, Math.min(TRAMI.max, Math.ceil(guests / GUESTS_PER_TRAMI))));
    else setGuestsLocal(Math.min(MAX_GUESTS, trami * GUESTS_PER_TRAMI));
    setBy(next);
  };

  const create = () => {
    setTried(true);
    if (!ready) return;
    createShoppingList(own ? CUSTOM_FUNCTION : occasion!, { by, value }, name);
    onDone();
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="space-y-6">
      {/* No banner on phones: straight to choosing. The page still has a heading for screen readers. */}
      <h1 className="sr-only">Plan your function</h1>

      <section aria-labelledby="plan-event">
        <h2 id="plan-event" className="font-sans text-base font-semibold tracking-normal">
          Select function
        </h2>
        <div role="radiogroup" aria-labelledby="plan-event" className="mt-3 grid grid-cols-2 gap-2.5">
          {functions.map((f) => {
            const on = !own && occasion === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setOccasion(f.id);
                  setOwn(false);
                }}
                className={cn(
                  "relative flex min-h-[4.5rem] items-center gap-3 rounded-control border bg-raised p-2.5 text-left transition-colors active:scale-[0.99]",
                  on ? "border-brand bg-surface ring-1 ring-brand" : "border-line-strong",
                )}
              >
                <KitThumb itemId={f.icon ?? "dastarkhan"} className="w-11 shrink-0" />
                <span className="min-w-0">
                  <span className="block font-serif text-base leading-tight">{f.name}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">{f.description}</span>
                </span>
                {on && (
                  <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-brand text-brand-ink">
                    <Check aria-hidden className="size-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          role="radio"
          aria-checked={own}
          onClick={() => setOwn(true)}
          className={cn(
            "mt-2.5 flex min-h-12 w-full items-center gap-3 rounded-control border bg-raised px-3.5 text-left transition-colors",
            own ? "border-brand bg-surface ring-1 ring-brand" : "border-line-strong",
          )}
        >
          <Sparkles aria-hidden className="size-5 text-accent-ink" />
          <span className="flex-1 text-md">Other function</span>
          {own ? <Check aria-hidden className="size-4 text-brand" /> : <Plus aria-hidden className="size-4 text-muted" />}
        </button>
        {own && (
          <label className="mt-2.5 block">
            <span className="mb-1.5 block text-sm font-medium">Name of your function</span>
            <input
              value={name}
              maxLength={FUNCTION_TITLE_MAX}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aqeeqah, Engagement, Dawat"
              aria-invalid={tried && needsName ? true : undefined}
              className={cn(
                "h-12 w-full rounded-control border bg-raised px-3.5 text-md outline-none focus:border-ink",
                tried && needsName ? "border-danger" : "border-line-strong",
              )}
            />
            {tried && needsName && <span className="mt-1 block text-sm text-danger">Give your function a name.</span>}
          </label>
        )}
      </section>

      <section aria-labelledby="plan-size">
        <h2 id="plan-size" className="font-sans text-base font-semibold tracking-normal">
          How would you like to plan?
        </h2>
        <div role="radiogroup" aria-labelledby="plan-size" className="mt-3 grid grid-cols-2 gap-1 rounded-control bg-surface p-1">
          {(
            [
              ["trami", "By Tramies", UtensilsCrossed],
              ["guests", "By Guests", Users],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={by === id}
              onClick={() => switchBy(id)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-chip text-md font-medium text-muted transition-colors aria-checked:bg-brand aria-checked:text-brand-ink"
            >
              <Icon aria-hidden className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-control border border-line-strong bg-raised p-2 focus-within:border-ink">
          <button
            type="button"
            aria-label={by === "guests" ? "10 fewer guests" : "5 fewer tramies"}
            onClick={() => field.stepBy(-step)}
            className="grid size-12 shrink-0 place-items-center rounded-chip bg-surface text-2xl active:scale-95"
          >
            −
          </button>
          <label className="flex min-w-0 flex-1 flex-col items-center">
            <input
              {...field.inputProps}
              aria-label={by === "guests" ? "Guests" : "Tramies"}
              className="w-full bg-transparent text-center text-3xl font-semibold leading-none tabular-nums outline-none"
            />
            <span className="text-sm text-muted">{by === "guests" ? "Guests" : "Tramies"}</span>
          </label>
          <button
            type="button"
            aria-label={by === "guests" ? "10 more guests" : "5 more tramies"}
            onClick={() => field.stepBy(step)}
            className="grid size-12 shrink-0 place-items-center rounded-chip bg-surface text-2xl active:scale-95"
          >
            +
          </button>
        </div>
        <p className="mt-2 text-center text-sm text-muted">
          {by === "guests"
            ? `≈ ${Math.ceil(guests / GUESTS_PER_TRAMI)} tramies · ${GUESTS_PER_TRAMI} guests share a trami`
            : `≈ ${trami * GUESTS_PER_TRAMI} guests · ${GUESTS_PER_TRAMI} guests share a trami`}
        </p>
      </section>

      <div className="space-y-3">
        <Button size="lg" className="h-14 w-full normal-case tracking-normal text-base" onClick={create}>
          <ShoppingBasket aria-hidden className="!size-5" />
          {onCancel ? "Update my shopping list" : "Create my shopping list"}
          <ArrowRight aria-hidden />
        </Button>
        {tried && !ready && !own && <p className="text-center text-sm text-danger">Choose your function first.</p>}
        {onCancel && (
          <Button variant="ghost" className="w-full normal-case tracking-normal" onClick={onCancel}>
            Keep my current list
          </Button>
        )}
        <div className="flex items-start gap-3 rounded-control bg-surface px-4 py-3 text-sm">
          <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-ink" />
          <p>
            <span className="font-medium">You&rsquo;ll get a recommended list</span>{" "}
            <span className="text-muted">of commonly needed items, which you can change before adding to your bag.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Screen 05 ------------------------------ */

function ShoppingList({ onEdit }: { onEdit: () => void }) {
  const { state, lines, gifts } = useKit();
  const settings = useStoreSettings();
  const guests = guestsOf(state);
  const name = state.occasion ? kitTitle({ occasion: state.occasion, title: state.title }) : "";
  const query = { ...queryOf(state), trami: state.trami };
  const url = `${siteUrl}/kit${kitQueryString(query)}`;
  const phone = settings.contact.whatsapp.replace(/\D/g, "");
  const share = `https://wa.me/${phone}?text=${encodeURIComponent(shareText(query, lines, url, gifts))}`;

  const iconBtn = "grid size-10 place-items-center rounded-control border border-line-strong text-ink active:bg-surface [&_svg]:size-[1.1rem]";

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-line bg-raised p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow text-accent-ink">Your shopping list</p>
            <h1 className="mt-1 font-serif text-3xl leading-tight">{name}</h1>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <a href={share} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" title="Share on WhatsApp" className={iconBtn}>
              <Share2 aria-hidden />
            </a>
            <button type="button" onClick={startOver} aria-label="Start over" title="Start over" className={iconBtn}>
              <RotateCcw aria-hidden />
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-control bg-surface py-2 pl-3.5 pr-1.5">
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-md font-medium tabular-nums">
              <Users aria-hidden className="size-4 shrink-0 text-accent-ink" />
              {guests} Guests · {state.guests ? Math.ceil(guests / GUESTS_PER_TRAMI) : state.trami} Tramies
            </span>
            <span className="block text-xs text-muted">Based on {GUESTS_PER_TRAMI} guests per trami</span>
          </span>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-chip px-2.5 text-sm font-medium text-brand active:bg-raised"
          >
            <Pencil aria-hidden className="size-3.5" />
            Edit
          </button>
        </div>

        <div className="mt-3">
          <div role="radiogroup" aria-label="Budget" className="grid grid-cols-3 gap-1 rounded-control bg-surface p-1">
            {tiers.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={state.tier === t.id}
                onClick={() => setTier(t.id)}
                className="h-10 rounded-chip text-sm font-medium text-muted transition-colors aria-checked:bg-raised aria-checked:text-ink aria-checked:shadow-sm"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="More for your function">
          {getKitCatalog().gifts.length > 0 && (
            <button type="button" onClick={openGiftSheet} aria-pressed={!!state.gifts?.length} className={chipBtn}>
              <Gift aria-hidden className="size-3.5" />
              {state.gifts?.length ? `Giveaways (${state.gifts.length})` : "Giveaways"}
            </button>
          )}
        </div>
        <div className="mt-2.5 empty:hidden">
          <SavedKitsButton />
        </div>
      </div>

      <section aria-labelledby="kit-list-title" className="overflow-hidden rounded-card border border-line bg-raised">
        <div className="px-5 pt-5">
          <h2 id="kit-list-title" className="font-serif text-2xl leading-tight">
            Recommended for your {name}
          </h2>
          <p className="mt-1 text-sm text-muted">Change types and quantities, remove what you don&rsquo;t need, or add more.</p>
        </div>
        <KitPanel showHeader={false} bar />
      </section>
    </div>
  );
}
