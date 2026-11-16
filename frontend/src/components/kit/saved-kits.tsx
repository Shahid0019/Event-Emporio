"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bookmark, X } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { kitFunctionById } from "@/lib/kit/catalog";
import { decodeSharedKit } from "@/lib/kit/shared";
import { deleteSavedKit, openSavedKit, SAVED_KITS_MAX, savedKitsStore, type SavedKit } from "@/lib/kit/saved";
import { kitChatHiddenStore, kitStore, startOver } from "@/lib/kit/store";
import { buildKit, kitTotal } from "@/lib/kit/buildKit";
import { giftLines, giftsTotal } from "@/lib/kit/gifts";
import { formatKitAmount } from "@/lib/kit/format";
import { cn, formatDate } from "@/lib/utils";
import { KitThumb } from "./kit-thumb";

/** Today's price for a saved kit (prices can change after it was saved). */
function currentTotal(saved: SavedKit) {
  const kit = decodeSharedKit(saved.kit);
  return kit ? kitTotal(buildKit(kit)) + giftsTotal(giftLines(kit.gifts)) : saved.total;
}

/** The picture that stands for a saved kit's function. */
const iconOf = (kit: string) => kitFunctionById(decodeSharedKit(kit)?.occasion)?.icon ?? "dastarkhan";

export function SavedKitsList({ onOpened, className }: { onOpened?: () => void; className?: string }) {
  const saved = savedKitsStore.useStore();
  if (!saved.length) return null;
  return (
    <ul className={cn("space-y-2", className)} aria-label="Saved kits">
      {saved.map((k) => (
        <li key={k.id} className="flex items-center gap-3 rounded-control border border-line bg-raised p-2 pr-1.5">
          <KitThumb itemId={iconOf(k.kit)} className="w-10" />
          <button
            type="button"
            onClick={() => {
              if (openSavedKit(k.id)) {
                toast.success(`${k.name} opened`);
                onOpened?.();
              } else toast.error("This saved kit couldn't be opened.");
            }}
            className="min-w-0 flex-1 text-left"
            aria-label={`Open saved kit: ${k.name}`}
          >
            <span className="block truncate text-md font-medium">{k.name}</span>
            {/* Tier and options tell apart kits for the same function and size. */}
            <span className="block truncate text-xs text-muted">{k.summary}</span>
            <span className="block truncate text-xs text-muted">
              {formatKitAmount(currentTotal(k))} · saved {formatDate(k.savedAt)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              deleteSavedKit(k.id);
              if (kitStore.get().savedId === k.id) kitStore.set((s) => ({ ...s, savedId: undefined }));
              toast(`${k.name} deleted from saved kits`);
            }}
            aria-label={`Delete saved kit: ${k.name}`}
            className="grid size-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * "Saved kits" with a count; opens the list in a sheet. Always shown (unless `hideWhenEmpty`) so
 * shoppers know where "Save & start over" puts their kit, with a short explanation while it's empty.
 */
export function SavedKitsButton({ className, hideWhenEmpty = false }: { className?: string; hideWhenEmpty?: boolean }) {
  const count = savedKitsStore.useStore((list) => list.length);
  const [open, setOpen] = useState(false);
  if (!count && hideWhenEmpty) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border border-line-strong px-3 text-sm transition-colors hover:border-ink",
          className,
        )}
      >
        <Bookmark aria-hidden className="size-3.5" />
        Saved kits
        {count > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-2xs font-medium tabular-nums text-brand-ink">
            {count}
          </span>
        )}
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Saved kits"
        description={`Save up to ${SAVED_KITS_MAX} kits on this device. Opening one replaces the kit on screen.`}
      >
        {count > 0 ? (
          <SavedKitsList onOpened={() => setOpen(false)} />
        ) : (
          <div className="rounded-card border border-dashed border-line-strong px-5 py-8 text-center">
            <Bookmark aria-hidden className="mx-auto size-6 text-accent-ink" />
            <p className="mt-3 font-medium">No saved kits yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
              Tap <span className="font-medium text-ink">Save</span> under your kit to keep it here while you plan another function.
            </p>
          </div>
        )}
      </Sheet>
    </>
  );
}

/** Clears the kit to plan a new one; the toast's Undo brings the old kit (and chat layout) back. */
export function resetKit() {
  const before = kitStore.get();
  const chatHidden = kitChatHiddenStore.get();
  startOver();
  if (!before.occasion) return;
  toast("Kit reset — start a new one", {
    description: "Want it back?",
    action: {
      label: "Undo",
      onClick: () => {
        kitStore.set(before);
        kitChatHiddenStore.set(chatHidden);
      },
    },
  });
}
