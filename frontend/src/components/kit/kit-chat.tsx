"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronUp,
  Gift,
  Minus,
  PanelLeftClose,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useNumberField } from "@/components/ui/quantity-selector";
import { buildKit, kitTotal, type KitPrefs } from "@/lib/kit/buildKit";
import { activeKitFunctions, getKitCatalog } from "@/lib/kit/catalog";
import { CUSTOM_FUNCTION, FUNCTION_TITLE_MAX, functionDates, GUESTS_PER_TRAMI, TRAMI, tiers } from "@/lib/kit/config";
import { formatEventDate, formatKitAmount } from "@/lib/kit/format";
import {
  answerDate,
  answerExactDate,
  answerOccasion,
  answerTier,
  cancelReopen,
  confirmPrefs,
  confirmTrami,
  daysUntil,
  goBack,
  guestsOf,
  kitTypingStore,
  MAX_GUESTS,
  openGiftSheet,
  setCountBy,
  setGuests,
  queryOf,
  reopenStep,
  setTrami,
  startOver,
  togglePref,
  type KitState,
  type KitStep,
} from "@/lib/kit/store";
import { cleanTitle, kitQueryString, occasionName, shareText, tierName } from "@/lib/kit/url";
import { useStoreSettings } from "@/components/providers/store-data";
import { siteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";
import { KitThumb } from "./kit-thumb";
import { SavedKitsList } from "./saved-kits";
import { savedKitsStore } from "@/lib/kit/saved";
import { useKit } from "./use-kit";

const prefOptions: { key: keyof KitPrefs; label: string }[] = [
  { key: "bio", label: "Bio / eco items" },
  { key: "printed", label: "Printed names" },
  { key: "extra", label: "Extra 10% stock" },
];

type Message = { key: string; from: "shop"; text: string } | { key: string; from: "user"; text: string; step: KitStep };

function shopText(step: KitStep, s: KitState, itemCount: number, total: number): string {
  switch (step) {
    case 0:
      return "Hello, and congratulations! Which function do you need supplies for?";
    case 1:
      return "Wonderful! How many guests are you expecting?";
    case 2:
      return `${s.trami >= 100 ? "That's a big celebration!" : "Lovely."} When is the function?`;
    case 3:
      return `${s.date === "this-week" ? "We'll send it by express delivery this week, so don't worry. " : ""}What budget do you have in mind? Each option shows its estimate.`;
    case 4:
      return "Anything special? Bio items, printed names, or a little extra stock?";
    case 5:
      return `Your kit is ready: ${itemCount} items, ${formatKitAmount(total)} in total. Take a look and change anything you like.`;
  }
}

function answerText(step: KitStep, s: KitState): string {
  switch (step) {
    case 0: {
      if (!s.occasion) return "";
      // "Sana ki Mehndi · Mehndi raat", or just the name for their own function.
      if (s.occasion === CUSTOM_FUNCTION) return s.title ?? occasionName(s.occasion);
      return s.title ? `${s.title} · ${occasionName(s.occasion)}` : occasionName(s.occasion);
    }
    case 1:
      return s.guests ? `${s.guests} guests` : `${s.trami} trami`;
    case 2:
      return s.eventDate ? formatEventDate(s.eventDate) : (functionDates.find((d) => d.id === s.date)?.label ?? "");
    case 3:
      return s.tier ? tierName(s.tier) : "";
    case 4: {
      const chosen = prefOptions.filter((p) => s.prefs[p.key]).map((p) => p.label);
      return chosen.length ? chosen.join(", ") : "Nothing special";
    }
    default:
      return "";
  }
}

/** Quick picks when counting by guests. */
const GUEST_PICKS = [100, 200, 400, 800];

const isoOf = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const chip =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-4 text-sm transition-colors aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-ink";
const chipIdle = "border-line-strong bg-raised text-ink hover:border-ink";

/** First-visit guide shown under the greeting so the empty chat explains itself. */
function howItWorks() {
  const names = activeKitFunctions()
    .slice(0, 3)
    .map((f) => f.name);
  return [
    { title: "Pick your function", text: names.length ? `${names.join(", ")} — or your own` : "Name your own function" },
    { title: "Tell us how many", text: "By guests, or by trami (one plate for four)" },
    { title: "Your kit is ready", text: "Every item counted, with a budget to match" },
  ];
}

export function KitChat({ className, onClose }: { className?: string; onClose?: () => void }) {
  const { state, active, total } = useKit();
  const typing = kitTypingStore.useStore();
  const savedCount = savedKitsStore.useStore((list) => list.length);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages: Message[] = [];
  for (let step = 0 as KitStep; step <= state.furthest; step = (step + 1) as KitStep) {
    messages.push({ key: `shop-${step}`, from: "shop", text: shopText(step, state, active.length, total) });
    if (step < state.furthest) messages.push({ key: `user-${step}`, from: "user", text: answerText(step, state), step });
  }
  if (state.fromShop) {
    const who = state.preparedFor ? `${state.preparedFor}, we've` : "We've";
    messages.push({ key: "prepared", from: "shop", text: `${who} put this kit together especially for you.` });
    if (state.shopNote) messages.push({ key: "shop-note", from: "shop", text: state.shopNote });
  }
  if (state.furthest === 5 && !state.gifts?.length && getKitCatalog().gifts.length)
    messages.push({
      key: "gifts",
      from: "shop",
      text: "Would you like giveaways or return gifts for your guests? Choose them from our shop.",
    });
  if (state.thanked) messages.push({ key: "thanks", from: "shop", text: "Thank you! Everything is in your bag." });
  // While "typing", hold back the newest shop message.
  const visible = typing && messages.at(-1)?.from === "shop" ? messages.slice(0, -1) : messages;
  // Messages already there when the chat (re)opens appear in place; only new ones fade in.
  const [initialKeys] = useState(() => new Set(visible.map((m) => m.key)));
  const scrolledOnce = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Jump straight to the latest message on open; glide only for messages that arrive later.
    const smooth = scrolledOnce.current && !reduce;
    scrolledOnce.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    // savedCount: the saved-kits list loads from this device after the first paint.
  }, [visible.length, typing, state.step, savedCount]);

  const editing = state.step < state.furthest;

  return (
    <section
      id="kit-chat"
      aria-label="Kit chat"
      className={cn("flex min-h-0 flex-col overflow-hidden rounded-card border border-line bg-raised", className)}
    >
      <header className="border-b border-line px-4 pb-3 pt-3.5">
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-brand font-serif text-base text-brand-ink">
            E
          </span>
          <p className="min-w-0 flex-1 font-medium leading-tight">Events Emporio</p>
          <p className="text-[0.78rem] tabular-nums text-muted">
            {state.furthest >= 5 ? "Kit ready" : `Question ${state.furthest + 1} of 5`}
          </p>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Minimise chat"
              aria-expanded
              aria-controls="kit-chat"
              title="Minimise chat"
              className="-my-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <ChevronUp aria-hidden className="size-5 md:hidden" />
              <PanelLeftClose aria-hidden className="hidden size-5 md:block" strokeWidth={1.75} />
            </button>
          )}
        </div>
        <div
          role="progressbar"
          aria-label="Kit progress"
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={state.furthest}
          className="mt-3 grid grid-cols-5 gap-1"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={cn("h-1 rounded-full transition-colors duration-500", i < state.furthest ? "bg-brand" : "bg-surface")}
            />
          ))}
        </div>
      </header>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="min-h-0 flex-1 space-y-3 overflow-y-auto [scrollbar-color:var(--line-strong)_transparent] [scrollbar-width:thin] px-4 py-5"
      >
        {visible.map((m) =>
          m.from === "shop" ? (
            <p
              key={m.key}
              className={cn(
                "mr-10 w-fit rounded-2xl rounded-tl-sm bg-surface px-4 py-2.5 text-[0.95rem] leading-relaxed text-ink",
                !initialKeys.has(m.key) && "animate-overlay-in",
              )}
            >
              {m.text}
            </p>
          ) : (
            <div key={m.key} className="flex justify-end">
              <button
                type="button"
                onClick={() => reopenStep(m.step)}
                aria-label={`Change answer: ${m.text}`}
                className={cn(
                  "group ml-10 inline-flex min-h-11 items-center gap-2 rounded-2xl rounded-tr-sm bg-brand px-4 py-2.5 text-left text-[0.95rem] text-brand-ink transition-colors hover:bg-brand-deep",
                  state.step === m.step && "ring-2 ring-accent ring-offset-2 ring-offset-raised",
                )}
              >
                {m.text}
                <Pencil aria-hidden className="size-3.5 opacity-70 group-hover:opacity-100" />
              </button>
            </div>
          ),
        )}
        {state.furthest === 0 && !typing && (
          <ol aria-label="How it works" className="mr-10 space-y-3 pt-3">
            {howItWorks().map((h, n) => (
              <li key={h.title} className="flex items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line-strong text-[0.75rem] font-medium tabular-nums">
                  {n + 1}
                </span>
                <span className="text-[0.88rem] leading-snug">
                  <span className="block font-medium">{h.title}</span>
                  <span className="block text-muted">{h.text}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
        {state.furthest === 0 && !typing && savedCount > 0 && (
          <div className="mr-10 pt-2">
            <p className="mb-2 text-[0.85rem] font-medium">Or open one of your saved kits</p>
            <SavedKitsList />
          </div>
        )}
        {typing && (
          <p className="flex w-fit items-center gap-1 rounded-2xl rounded-tl-sm bg-surface px-4 py-3.5" aria-label="Shopkeeper is typing">
            {[0, 150, 300].map((d) => (
              <span key={d} aria-hidden className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d}ms` }} />
            ))}
          </p>
        )}
      </div>

      <div className="border-t border-line bg-canvas px-4 pb-4 pt-3">
        {(state.step > 0 || editing) && (
          <div className="-mt-1 mb-1.5 flex items-center justify-between gap-3 text-[0.8rem]">
            {state.step > 0 ? (
              <button
                type="button"
                onClick={goBack}
                className="-ml-2 inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 font-medium text-muted transition-colors hover:text-ink"
              >
                <ArrowLeft aria-hidden className="size-3.5" />
                Previous question
              </button>
            ) : (
              <span />
            )}
            {editing && (
              <span className="flex items-center gap-2">
                <span className="text-accent-ink">Changing an answer</span>
                <button type="button" onClick={cancelReopen} className="min-h-9 px-2 font-medium underline underline-offset-4">
                  Keep it
                </button>
              </span>
            )}
          </div>
        )}
        <StepControls step={state.step} />
      </div>
    </section>
  );
}

function StepControls({ step }: { step: KitStep }) {
  const { state, lines, gifts, total } = useKit();
  const settings = useStoreSettings();
  switch (step) {
    case 0:
      return <FunctionStep />;

    case 1:
      return <CountStep />;

    case 2:
      return <DateStep />;

    case 3: {
      if (!state.occasion) return null;
      const answers = { occasion: state.occasion, trami: state.trami, guests: state.guests, prefs: state.prefs };
      return (
        <div className="grid grid-cols-3 gap-2">
          {tiers.map((t) => {
            const tierTotal = kitTotal(buildKit({ ...answers, tier: t.id }));
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={state.tier === t.id}
                onClick={() => answerTier(t.id)}
                className="flex min-h-24 flex-col items-start justify-between rounded-control border border-line-strong bg-raised p-2.5 text-left transition-colors hover:border-ink aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-ink sm:p-3"
              >
                <span className="text-[0.72rem] font-medium uppercase tracking-[0.12em]">{t.name}</span>
                <span className="mt-1 text-base font-medium tabular-nums sm:text-lg">{formatKitAmount(tierTotal)}</span>
                <span className="text-[0.72rem] tabular-nums opacity-90">
                  {state.guests
                    ? `${formatKitAmount(tierTotal / state.guests)}/guest`
                    : `${formatKitAmount(tierTotal / state.trami)}/trami`}
                </span>
              </button>
            );
          })}
        </div>
      );
    }

    case 4:
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Preferences">
            {prefOptions.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={state.prefs[p.key]}
                onClick={() => togglePref(p.key)}
                className={cn(chip, chipIdle)}
              >
                {state.prefs[p.key] && <Check aria-hidden className="size-4" />}
                {p.label}
              </button>
            ))}
          </div>
          <Button className="w-full" onClick={confirmPrefs}>
            Show my kit
          </Button>
        </div>
      );

    case 5: {
      const query = { ...queryOf(state), trami: state.trami };
      const url = `${siteUrl}/kit${kitQueryString(query)}`;
      const phone = settings.contact.whatsapp.replace(/\D/g, "");
      const href = `https://wa.me/${phone}?text=${encodeURIComponent(shareText(query, lines, url, gifts))}`;
      return (
        <div className="grid grid-cols-2 gap-2">
          {getKitCatalog().gifts.length > 0 && (
            <Button variant="outline" className="col-span-2 w-full border-accent bg-accent-soft/40 px-3" onClick={openGiftSheet}>
              <Gift aria-hidden />
              {state.gifts?.length ? `Giveaways (${state.gifts.length})` : "Choose giveaways"}
            </Button>
          )}
          <a href={href} target="_blank" rel="noopener noreferrer" className={buttonVariants({ className: "w-full px-3" })}>
            Share on WhatsApp
          </a>
          <Button variant="outline" className="w-full px-3" onClick={startOver}>
            <RotateCcw aria-hidden />
            Start over
          </Button>
          <p className="col-span-2 text-center text-[0.78rem] text-muted">
            {formatKitAmount(total)} in total · you can change anything in your kit
          </p>
        </div>
      );
    }
  }
}

/**
 * "Which function?" — the shop's functions (one tap), or the shopper's
 * own. Either way they can give it their own name, which follows the kit
 * into the bag, saved kits and shared links.
 */
function FunctionStep() {
  const { state } = useKit();
  const functions = activeKitFunctions();
  const [name, setName] = useState(state.title ?? "");
  const [needName, setNeedName] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const named = cleanTitle(name);

  const pickOwn = () => {
    if (!named) {
      setNeedName(true);
      nameRef.current?.focus();
      return;
    }
    answerOccasion(CUSTOM_FUNCTION, name);
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="kit-function-name" className="mb-1.5 flex items-baseline justify-between gap-2 text-[0.8rem] font-medium">
          Function name
          <span className={cn("font-normal", needName && !named ? "text-danger" : "text-muted")}>
            {needName ? "Needed for your own function" : "Optional"}
          </span>
        </label>
        <input
          ref={nameRef}
          id="kit-function-name"
          value={name}
          maxLength={FUNCTION_TITLE_MAX}
          placeholder="e.g. Sana's Mehndi, Aqeeqah, Engagement…"
          aria-invalid={needName && !named ? true : undefined}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && needName) pickOwn();
          }}
          className={cn(
            "h-11 w-full rounded-control border bg-raised px-3.5 text-[0.95rem] outline-none transition-colors placeholder:text-muted/70 focus:border-ink",
            needName && !named ? "border-danger" : "border-line-strong",
          )}
        />
      </div>

      <div role="group" aria-label="Function" className="grid grid-cols-2 gap-2">
        {functions.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={state.occasion === f.id}
            onClick={() => answerOccasion(f.id, name)}
            className="flex min-h-16 items-center gap-2.5 rounded-control border border-line-strong bg-raised p-2 text-left transition-colors hover:border-ink aria-pressed:border-brand aria-pressed:bg-brand/5"
          >
            <KitThumb itemId={f.icon ?? "dastarkhan"} className="w-10" />
            <span className="min-w-0">
              <span className="block truncate font-serif text-[1.2rem] leading-tight">{f.name}</span>
              <span className="block truncate text-[0.75rem] leading-snug text-muted">{f.description}</span>
            </span>
          </button>
        ))}
        <button
          type="button"
          aria-pressed={state.occasion === CUSTOM_FUNCTION}
          onClick={pickOwn}
          className={cn(
            "flex min-h-16 items-center gap-2.5 rounded-control border border-dashed bg-raised p-2 text-left transition-colors aria-pressed:border-solid aria-pressed:border-brand aria-pressed:bg-brand/5",
            functions.length % 2 === 0 && "col-span-2",
            needName ? "border-brand" : "border-line-strong hover:border-ink",
          )}
        >
          <span className="grid aspect-[4/5] w-10 shrink-0 place-items-center rounded-chip bg-accent-soft text-accent-ink">
            <Sparkles aria-hidden className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-serif text-[1.2rem] leading-tight">{needName && named ? named : "Your own function"}</span>
            <span className="block truncate text-[0.75rem] leading-snug text-muted">
              {needName ? (named ? "Tap to continue" : "Type its name above") : "Something else? Name it yourself"}
            </span>
          </span>
          {needName && named && <ArrowRight aria-hidden className="mr-1 size-4 shrink-0 text-brand" />}
        </button>
      </div>
      {needName && <p className="text-[0.78rem] text-muted">Every essential item is included — you can add extras later.</p>}
    </div>
  );
}

/** "How many?" — by guests (one of each item per person) or by trami (a shared plate for four). */
function CountStep() {
  const { state } = useKit();
  const byGuests = state.countBy === "guests";
  const guests = guestsOf(state);
  const tramiField = useNumberField({ value: state.trami, onChange: setTrami, min: TRAMI.min, max: TRAMI.max });
  const guestField = useNumberField({ value: guests, onChange: setGuests, min: 1, max: MAX_GUESTS });
  const field = byGuests ? guestField : tramiField;
  const value = byGuests ? guests : state.trami;
  const step = byGuests ? 10 : 1;
  const min = byGuests ? 1 : TRAMI.min;
  const max = byGuests ? MAX_GUESTS : TRAMI.max;
  const picks = byGuests ? GUEST_PICKS : TRAMI.quickPicks;
  const unit = byGuests ? (guests === 1 ? "guest" : "guests") : "trami";
  const stepBtn =
    "grid size-11 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-surface disabled:text-line-strong disabled:hover:bg-transparent [&_svg]:size-5";

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Count by" className="grid grid-cols-2 rounded-full bg-surface p-1">
        {(
          [
            ["trami", "By trami"],
            ["guests", "By guests"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={(state.countBy ?? "trami") === id}
            onClick={() => setCountBy(id)}
            className="h-9 rounded-full text-[0.82rem] font-medium text-muted transition-colors hover:text-ink aria-checked:bg-raised aria-checked:text-ink aria-checked:shadow-sm"
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-2 rounded-card border border-line-strong bg-raised p-1.5 focus-within:border-ink">
          <button
            type="button"
            aria-label={byGuests ? "10 fewer guests" : "1 fewer trami"}
            onClick={() => field.stepBy(-step)}
            disabled={value <= min}
            className={stepBtn}
          >
            <Minus />
          </button>
          <label className="flex min-w-0 flex-1 cursor-text items-baseline justify-center gap-2">
            <input
              {...field.inputProps}
              aria-label={byGuests ? "Guests" : "Trami"}
              aria-describedby="count-hint"
              onKeyDown={(e) => {
                field.inputProps.onKeyDown(e);
                // Enter also confirms the answer once the number is in.
                if (e.key === "Enter") confirmTrami();
              }}
              style={{ width: `${Math.max(2, String(field.inputProps.value).length) + 0.5}ch` }}
              className="bg-transparent text-right text-[2rem] font-medium leading-none tabular-nums outline-none"
            />
            <span className="text-[0.95rem] text-muted">{unit}</span>
          </label>
          <button
            type="button"
            aria-label={byGuests ? "10 more guests" : "1 more trami"}
            onClick={() => field.stepBy(step)}
            disabled={value >= max}
            className={stepBtn}
          >
            <Plus />
          </button>
        </div>
        <p id="count-hint" className="mt-1.5 text-center text-[0.76rem] text-muted">
          {byGuests
            ? "One of each item per guest"
            : `≈ ${state.trami * GUESTS_PER_TRAMI} guests · ${GUESTS_PER_TRAMI} guests share a trami`}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Quick picks">
        {picks.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            onClick={() => (byGuests ? setGuests(n) : setTrami(n))}
            className="h-9 rounded-full border border-line text-[0.85rem] tabular-nums transition-colors hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-canvas"
          >
            {n}
          </button>
        ))}
      </div>

      <Button className="w-full" onClick={confirmTrami}>
        {byGuests ? `Yes, ${guests} guests` : `Yes, ${state.trami} trami`}
        <ArrowRight aria-hidden />
      </Button>
    </div>
  );
}

/** "When is the function?" — a quick answer, or an exact date from the calendar. */
function DateStep() {
  const { state } = useKit();
  // Today's date is read once when the step opens (not on every render).
  const [range] = useState(() => {
    const today = new Date();
    const max = new Date(today);
    max.setFullYear(today.getFullYear() + 1);
    return { min: isoOf(today), max: isoOf(max) };
  });
  const [picked, setPicked] = useState(state.eventDate ?? "");
  const valid = picked >= range.min && picked <= range.max;
  const days = valid ? daysUntil(picked) : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {functionDates.map((d) => (
          <button
            key={d.id}
            type="button"
            aria-pressed={!state.eventDate && state.date === d.id}
            onClick={() => answerDate(d.id)}
            className={cn(chip, chipIdle)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 text-[0.75rem] uppercase tracking-[0.14em] text-muted">
        <span className="h-px flex-1 bg-line" />
        or an exact date
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Function date</span>
          <CalendarDays aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="date"
            value={picked}
            min={range.min}
            max={range.max}
            onChange={(e) => setPicked(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && valid) answerExactDate(picked);
            }}
            aria-describedby="kit-date-hint"
            className="h-12 w-full rounded-full border border-line-strong bg-raised pl-11 pr-4 text-sm tabular-nums focus:border-ink focus:outline-none"
          />
        </label>
        <Button className="h-12 shrink-0" disabled={!valid} onClick={() => answerExactDate(picked)}>
          Use this date
        </Button>
      </div>
      <p id="kit-date-hint" className="min-h-5 text-center text-[0.8rem] text-muted" aria-live="polite">
        {picked && !valid
          ? "Choose a date within the next year."
          : days !== null
            ? `${formatEventDate(picked, "long")} · ${days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}`
            : "Pick the function date from the calendar."}
      </p>
    </div>
  );
}
