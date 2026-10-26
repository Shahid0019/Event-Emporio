"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bookmark, X } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { kitFunctionById } from "@/lib/kit/catalog";
import { decodeSharedKit } from "@/lib/kit/shared";
import { deleteSavedKit, openSavedKit, savedKitsStore, type SavedKit } from "@/lib/kit/saved";
import { kitStore } from "@/lib/kit/store";
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
            <span className="block truncate text-[0.9rem] font-medium">{k.name}</span>
            <span className="block truncate text-[0.75rem] text-muted">
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

/** "Saved (2)" in the kit header; opens the list in a sheet. */
export function SavedKitsButton() {
  const count = savedKitsStore.useStore((list) => list.length);
  const [open, setOpen] = useState(false);
  if (!count) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-strong px-3 text-[0.78rem] transition-colors hover:border-ink"
      >
        <Bookmark aria-hidden className="size-3.5" /> Saved ({count})
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Saved kits"
        description="Saved on this device. Opening one replaces the kit on screen."
      >
        <SavedKitsList onOpened={() => setOpen(false)} />
      </Sheet>
    </>
  );
}
