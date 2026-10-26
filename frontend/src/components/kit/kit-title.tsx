"use client";

import { useState } from "react";
import { Check, Pencil, Tag } from "lucide-react";
import { FUNCTION_TITLE_MAX } from "@/lib/kit/config";
import { setKitTitle } from "@/lib/kit/store";
import { cn } from "@/lib/utils";
import { useKit } from "./use-kit";

/** The shopper's own name for their function — tap to add or change it. */
export function KitTitleEditor({ className }: { className?: string }) {
  const { state } = useKit();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  if (editing) {
    const done = () => {
      setKitTitle(value);
      setEditing(false);
    };
    return (
      <form
        className={cn("flex items-center gap-2", className)}
        onSubmit={(e) => {
          e.preventDefault();
          done();
        }}
      >
        <label className="sr-only" htmlFor="kit-title-input">
          Function name
        </label>
        <input
          id="kit-title-input"
          autoFocus
          value={value}
          maxLength={FUNCTION_TITLE_MAX}
          placeholder="e.g. Sana's Mehndi"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          className="h-10 min-w-0 flex-1 rounded-full border border-ink bg-raised px-4 text-[0.9rem] outline-none"
        />
        <button
          type="submit"
          aria-label="Save name"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-brand-ink transition-colors hover:bg-brand-deep"
        >
          <Check className="size-4" />
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(state.title ?? "");
        setEditing(true);
      }}
      className={cn(
        "group inline-flex max-w-full items-center gap-2 rounded-full text-left transition-colors",
        state.title
          ? "text-ink"
          : "border border-dashed border-line-strong px-3 py-1.5 text-[0.8rem] text-muted hover:border-ink hover:text-ink",
        className,
      )}
    >
      {state.title ? (
        <>
          <Tag aria-hidden className="size-3.5 shrink-0 text-accent-ink" />
          <span className="truncate font-serif text-[1.15rem] italic leading-tight text-brand">{state.title}</span>
          <Pencil aria-hidden className="size-3 shrink-0 text-muted opacity-60 group-hover:opacity-100" />
          <span className="sr-only">— change function name</span>
        </>
      ) : (
        <>
          <Tag aria-hidden className="size-3.5" /> Name your function
        </>
      )}
    </button>
  );
}
