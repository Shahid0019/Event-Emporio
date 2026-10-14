"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronUp, Minus, PanelLeftClose, Pencil, Plus, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { buildKit, kitTotal, type KitPrefs } from "@/lib/kit/buildKit";
import { functionDates, GUESTS_PER_TRAMI, occasions, TRAMI, tiers, type Occasion } from "@/lib/kit/config";
import { formatKitAmount } from "@/lib/kit/format";
import {
  answerDate,
  answerOccasion,
  answerTier,
  cancelReopen,
  confirmPrefs,
  confirmTrami,
  kitTypingStore,
  queryOf,
  reopenStep,
  setTrami,
  startOver,
  togglePref,
  type KitState,
  type KitStep,
} from "@/lib/kit/store";
import { kitQueryString, occasionName, shareText, tierName } from "@/lib/kit/url";
import { storeSettings } from "@/lib/data/settings";
import { siteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";
import { KitThumb } from "./kit-panel";
import { useKit } from "./use-kit";

const prefOptions: { key: keyof KitPrefs; label: string }[] = [
  { key: "bio", label: "Bio / eco items" },
  { key: "printed", label: "Naam chhapwana" },
  { key: "extra", label: "Extra 10% stock" },
];

/** Which item illustration stands for each occasion. */
const occasionIcon: Record<Occasion, string> = { wazwan: "dastarkhan", nikkah: "potli", mehndi: "mehndi", walima: "cakeplate" };

type Message = { key: string; from: "shop"; text: string } | { key: string; from: "user"; text: string; step: KitStep };

function shopText(step: KitStep, s: KitState, itemCount: number, total: number): string {
  switch (step) {
    case 0:
      return "Assalamu alaikum! Shaadi mubarak ho. Kis function ke liye saamaan chahiye?";
    case 1:
      return "MashaAllah! Kitne trami lagenge? Ek trami par chaar mehmaan baithte hain.";
    case 2:
      return `${s.trami >= 100 ? "MashaAllah, bada function hai!" : "Bahut khoob."} Function kab hai?`;
    case 3:
      return `${s.date === "this-week" ? "Is hafte ke liye express delivery se bhej denge, fikr na kijiye. " : ""}Budget kya socha hai? Har option ka andaaza saath mein hai.`;
    case 4:
      return "Kuch khaas chahiye? Bio items, naam chhapwana, ya thoda extra stock?";
    case 5:
      return `Aapka kit tayyar hai: ${itemCount} cheezein, kul ${formatKitAmount(total)}. Kit mein dekhiye, jo chahein badal lijiye.`;
  }
}

function answerText(step: KitStep, s: KitState): string {
  switch (step) {
    case 0:
      return s.occasion ? occasionName(s.occasion) : "";
    case 1:
      return `${s.trami} trami`;
    case 2:
      return functionDates.find((d) => d.id === s.date)?.label ?? "";
    case 3:
      return s.tier ? tierName(s.tier) : "";
    case 4: {
      const chosen = prefOptions.filter((p) => s.prefs[p.key]).map((p) => p.label);
      return chosen.length ? chosen.join(", ") : "Kuch khaas nahi";
    }
    default:
      return "";
  }
}

const chip =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-4 text-sm transition-colors aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-ink";
const chipIdle = "border-line-strong bg-raised text-ink hover:border-ink";

/** First-visit guide shown under the greeting so the empty chat explains itself. */
const howItWorks = [
  { title: "Function chuniye", text: "Wazwan, Nikkah, Mehndi ya Walima" },
  { title: "Trami batayiye", text: "Ek trami = chaar mehmaan" },
  { title: "Kit tayyar", text: "Har cheez gin kar, budget ke saath" },
];

export function KitChat({ className, onClose }: { className?: string; onClose?: () => void }) {
  const { state, active, total } = useKit();
  const typing = kitTypingStore.useStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages: Message[] = [];
  for (let step = 0 as KitStep; step <= state.furthest; step = (step + 1) as KitStep) {
    messages.push({ key: `shop-${step}`, from: "shop", text: shopText(step, state, active.length, total) });
    if (step < state.furthest) messages.push({ key: `user-${step}`, from: "user", text: answerText(step, state), step });
  }
  if (state.thanked) messages.push({ key: "thanks", from: "shop", text: "Shukriya! Saara saamaan cart mein daal diya." });
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
  }, [visible.length, typing, state.step]);

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
            {state.furthest >= 5 ? "Kit tayyar" : `Sawaal ${state.furthest + 1} / 5`}
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
            {howItWorks.map((h, n) => (
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
        {typing && (
          <p className="flex w-fit items-center gap-1 rounded-2xl rounded-tl-sm bg-surface px-4 py-3.5" aria-label="Shopkeeper is typing">
            {[0, 150, 300].map((d) => (
              <span key={d} aria-hidden className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d}ms` }} />
            ))}
          </p>
        )}
      </div>

      <div className="border-t border-line bg-canvas px-4 pb-4 pt-3">
        {editing && (
          <div className="mb-2 flex items-center justify-between gap-3 text-[0.8rem]">
            <p className="text-accent-ink">Jawab badal rahe hain</p>
            <button type="button" onClick={cancelReopen} className="min-h-11 px-2 font-medium underline underline-offset-4">
              Rehne dijiye
            </button>
          </div>
        )}
        <StepControls step={state.step} />
      </div>
    </section>
  );
}

function StepControls({ step }: { step: KitStep }) {
  const { state, lines, total } = useKit();

  switch (step) {
    case 0:
      return (
        <div className="grid grid-cols-2 gap-2">
          {occasions.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={state.occasion === o.id}
              onClick={() => answerOccasion(o.id)}
              className="flex min-h-16 items-center gap-2.5 rounded-control border border-line-strong bg-raised p-2 text-left transition-colors hover:border-ink aria-pressed:border-brand aria-pressed:bg-brand/5"
            >
              <KitThumb itemId={occasionIcon[o.id]} className="w-10" />
              <span className="min-w-0">
                <span className="block font-serif text-[1.2rem] leading-tight">{o.name}</span>
                <span className="block text-[0.75rem] leading-snug text-muted">{o.adds ?? o.description}</span>
              </span>
            </button>
          ))}
        </div>
      );

    case 1:
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-5">
            <StepperButton
              label={`${TRAMI.step} trami kam`}
              onClick={() => setTrami(state.trami - TRAMI.step)}
              disabled={state.trami <= TRAMI.min}
            >
              <Minus />
            </StepperButton>
            <div className="w-28 text-center">
              <output aria-live="polite" aria-label="Trami" className="block text-[2.75rem] font-medium leading-none tabular-nums">
                {state.trami}
              </output>
              <span className="text-[0.78rem] text-muted">≈ {state.trami * GUESTS_PER_TRAMI} mehmaan</span>
            </div>
            <StepperButton
              label={`${TRAMI.step} trami zyada`}
              onClick={() => setTrami(state.trami + TRAMI.step)}
              disabled={state.trami >= TRAMI.max}
            >
              <Plus />
            </StepperButton>
          </div>
          <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Quick picks">
            {TRAMI.quickPicks.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={state.trami === n}
                onClick={() => setTrami(n)}
                className={cn(chip, chipIdle, "min-w-14")}
              >
                {n}
              </button>
            ))}
          </div>
          <Button className="w-full" onClick={confirmTrami}>
            Haan, {state.trami} trami
          </Button>
        </div>
      );

    case 2:
      return (
        <div className="grid grid-cols-2 gap-2">
          {functionDates.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-pressed={state.date === d.id}
              onClick={() => answerDate(d.id)}
              className={cn(chip, chipIdle)}
            >
              {d.label}
            </button>
          ))}
        </div>
      );

    case 3: {
      if (!state.occasion) return null;
      const answers = { occasion: state.occasion, trami: state.trami, prefs: state.prefs };
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
                <span className="text-[0.72rem] tabular-nums opacity-90">{formatKitAmount(tierTotal / state.trami)}/trami</span>
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
            Mera kit dikhaiye
          </Button>
        </div>
      );

    case 5: {
      const query = { ...queryOf(state), trami: state.trami };
      const url = `${siteUrl}/kit${kitQueryString(query)}`;
      const phone = storeSettings.contact.whatsapp?.replace(/\D/g, "") ?? "";
      const href = `https://wa.me/${phone}?text=${encodeURIComponent(shareText(query, lines, url))}`;
      return (
        <div className="grid grid-cols-2 gap-2">
          <a href={href} target="_blank" rel="noopener noreferrer" className={buttonVariants({ className: "w-full px-3" })}>
            Share on WhatsApp
          </a>
          <Button variant="outline" className="w-full px-3" onClick={startOver}>
            <RotateCcw aria-hidden />
            Start over
          </Button>
          <p className="col-span-2 text-center text-[0.78rem] text-muted">
            Kul {formatKitAmount(total)} · kit mein kuch bhi badal sakte hain
          </p>
        </div>
      );
    }
  }
}

function StepperButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-14 place-items-center rounded-full border border-line-strong bg-raised text-ink transition-colors hover:border-ink disabled:text-line-strong [&_svg]:size-5"
    >
      {children}
    </button>
  );
}
