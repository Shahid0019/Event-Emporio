"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { formatKitAmount } from "@/lib/kit/format";
import { applyKitParams, kitChatHiddenStore, kitStore, queryOf, setChatHidden, type KitState } from "@/lib/kit/store";
import { kitQueryString } from "@/lib/kit/url";
import { cn } from "@/lib/utils";
import { KitChat } from "./kit-chat";
import { KitPanel, kitSummary } from "./kit-panel";
import { useKit } from "./use-kit";

const thinScroll = "[scrollbar-color:var(--line-strong)_transparent] [scrollbar-width:thin]";
const columnHeight = "md:sticky md:top-[calc(var(--header-h)+1rem)] md:h-[calc(100dvh-var(--header-h)-4.75rem)]";

/**
 * Runs a layout change as a View Transition: the browser snapshots the old
 * and new layouts and animates between them on the GPU, so nothing is laid
 * out frame by frame. Falls back to an instant change where unsupported.
 */
function withViewTransition(update: () => void) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || typeof document.startViewTransition !== "function") {
    update();
    return;
  }
  // Only the chat and kit cards are captured; the rest of the page isn't snapshotted at all.
  const root = document.documentElement;
  root.classList.add("kit-transition");
  const transition = document.startViewTransition(() => flushSync(update));
  transition.finished.finally(() => root.classList.remove("kit-transition"));
}

/** Move focus to the control that replaced the one just pressed. */
const focusSoon = (selector: string) => requestAnimationFrame(() => document.querySelector<HTMLElement>(selector)?.focus());

export function KitBuilder() {
  const { state, active, total } = useKit();
  const [sheetOpen, setSheetOpen] = useState(false);
  const query = kitQueryString(queryOf(state));
  // The chat can only be minimised once there's a kit to look at.
  const chatHidden = kitChatHiddenStore.useStore() && state.occasion !== null;

  // Load ?ready / ?occasion / shared links once on arrival.
  useEffect(() => {
    applyKitParams(new URLSearchParams(window.location.search));
  }, []);

  // Keep occasion, trami and tier in the URL so the address is always shareable.
  // Reads the store directly so the first run sees the kit just loaded above.
  useEffect(() => {
    const next = kitQueryString(queryOf(kitStore.get()));
    if (next !== window.location.search) window.history.replaceState(null, "", `${window.location.pathname}${next}`);
  }, [query]);

  const closeChat = () => {
    withViewTransition(() => setChatHidden(true));
    focusSoon("#kit-chat-open");
  };
  const openChat = () => {
    withViewTransition(() => setChatHidden(false));
    focusSoon('#kit-chat button[aria-label="Minimise chat"]');
  };

  return (
    <div className="container-luxe pb-28 pt-4 md:pb-12 md:pt-6">
      <h1 className="sr-only">Build my kit</h1>
      <div
        className={cn(
          "grid grid-cols-[minmax(0,1fr)] gap-4 md:gap-6",
          chatHidden ? "md:grid-cols-[4.5rem_minmax(0,1fr)]" : "md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]",
        )}
      >
        {chatHidden ? (
          <ChatLauncher state={state} onOpen={openChat} />
        ) : (
          <KitChat
            onClose={state.occasion ? closeChat : undefined}
            className={cn("h-[calc(100dvh-var(--header-h)-9.5rem)] min-h-[28rem] [view-transition-name:kit-chat]", columnHeight)}
          />
        )}

        {/* With the chat open, phones see the kit through the bottom bar; minimised, it sits right here. */}
        <section
          aria-labelledby="kit-title"
          className={cn(
            "rounded-card border border-line bg-raised [view-transition-name:kit-panel] md:block md:overflow-y-auto",
            thinScroll,
            columnHeight,
            chatHidden ? "block" : "hidden",
          )}
        >
          <KitPanel />
        </section>
      </div>

      {/* Mobile: while chatting, the kit lives in a sticky bar that opens a full sheet. */}
      {state.occasion && !chatHidden && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-raised/95 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setSheetOpen(true)}
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-full bg-brand px-5 text-sm font-medium text-brand-ink"
          >
            <span className="tabular-nums">
              {active.length} items · {formatKitAmount(total)}
            </span>
            <span className="inline-flex items-center gap-1">
              View kit <ChevronUp aria-hidden className="size-4" />
            </span>
          </button>
        </div>
      )}

      <Sheet
        open={sheetOpen && !chatHidden}
        onOpenChange={setSheetOpen}
        side="bottom"
        title="Aapka kit"
        description={kitSummary(state) || undefined}
        className="h-[94dvh] max-h-[94dvh] bg-raised"
        bodyClassName={cn("p-0", thinScroll)}
      >
        <KitPanel showHeader={false} />
      </Sheet>
    </div>
  );
}

/** The minimised chat: a one-line bar on phones, a slim rail beside the kit on larger screens. */
function ChatLauncher({ state, onOpen }: { state: KitState; onOpen: () => void }) {
  const done = state.furthest >= 5;
  const status = done ? "Kit tayyar · jawab badlein" : `Sawaal ${state.furthest + 1} / 5 baaki`;
  return (
    <button
      id="kit-chat-open"
      type="button"
      onClick={onOpen}
      aria-expanded={false}
      aria-controls="kit-chat"
      aria-label={`Open chat. ${status}`}
      className={cn(
        "group flex min-h-16 w-full items-center gap-3 rounded-card border border-line bg-raised px-4 py-2.5 text-left transition-colors [view-transition-name:kit-chat] hover:border-ink",
        "md:flex-col md:justify-start md:gap-5 md:px-0 md:py-5",
        columnHeight,
      )}
    >
      <span
        aria-hidden
        className="relative grid size-10 shrink-0 place-items-center rounded-full bg-brand font-serif text-base text-brand-ink"
      >
        E{!done && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-raised bg-accent" />}
      </span>

      <span className="min-w-0 flex-1 md:flex-none md:rotate-180 md:[writing-mode:vertical-rl]">
        <span className="block text-[0.95rem] font-medium md:text-[0.78rem] md:uppercase md:tracking-[0.16em]">Chat kholiye</span>
        <span className="block truncate text-[0.8rem] text-muted md:hidden">{status}</span>
      </span>

      <span aria-hidden className="hidden flex-col gap-1 md:flex">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("h-5 w-1 rounded-full", i < state.furthest ? "bg-brand" : "bg-surface")} />
        ))}
      </span>

      <ChevronDown aria-hidden className="size-5 shrink-0 text-muted transition-transform group-hover:translate-y-0.5 md:hidden" />
    </button>
  );
}
