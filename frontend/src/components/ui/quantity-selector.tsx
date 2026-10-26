"use client";

import { useState, type KeyboardEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A number the shopper can type or step. While typing, every valid number is
 * applied at once (totals update live); leaving the field — or Enter — puts
 * an empty or out-of-range entry back within limits. Arrow keys step by
 * `step`, Escape undoes the typing.
 */
export function useNumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));
  const commit = () => {
    if (draft !== null) {
      const n = Number(draft);
      const next = draft === "" || !Number.isFinite(n) ? value : clamp(n);
      if (next !== value) onChange(next);
    }
    setDraft(null);
  };
  return {
    inputProps: {
      type: "text",
      inputMode: "numeric" as const,
      pattern: "[0-9]*",
      autoComplete: "off",
      value: draft ?? String(value),
      onFocus: (e: { currentTarget: HTMLInputElement }) => e.currentTarget.select(),
      onChange: (e: { currentTarget: HTMLInputElement }) => {
        const digits = e.currentTarget.value.replace(/\D/g, "").slice(0, String(max).length);
        setDraft(digits);
        const n = Number(digits);
        if (digits !== "" && n >= min && n <= max && n !== value) onChange(n);
      },
      onBlur: commit,
      onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape" && draft !== null) {
          e.preventDefault();
          setDraft(null);
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          setDraft(null);
          onChange(clamp(value + (e.key === "ArrowUp" ? step : -step)));
        }
      },
    },
    /** For −/+ buttons: drop any half-typed entry first. */
    stepBy: (delta: number) => {
      setDraft(null);
      onChange(clamp(value + delta));
    },
  };
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max,
  step = 1,
  size = "md",
  label = "Quantity",
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  /** Amount each tap adds or removes; the result is clamped to min/max. */
  step?: number;
  size?: "sm" | "md";
  label?: string;
  className?: string;
}) {
  const { inputProps, stepBy } = useNumberField({ value, onChange, min, max, step });
  const btn = cn(
    "grid shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:text-line-strong disabled:hover:bg-transparent",
    size === "sm" ? "size-9" : "size-12",
  );
  // Wide enough for the longest number allowed, never narrower than before.
  const width = `${Math.max(2, String(max).length, String(inputProps.value).length) + 1.5}ch`;
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex items-center overflow-hidden rounded-full border border-line-strong bg-raised focus-within:border-ink",
        className,
      )}
    >
      <button type="button" className={btn} onClick={() => stepBy(-step)} disabled={value <= min} aria-label="Decrease quantity">
        <Minus className="size-3.5" />
      </button>
      <input
        {...inputProps}
        aria-label={label}
        style={{ width }}
        className={cn("min-w-0 bg-transparent text-center text-sm tabular-nums outline-none", size === "sm" ? "min-w-8" : "min-w-10")}
      />
      <button type="button" className={btn} onClick={() => stepBy(step)} disabled={value >= max} aria-label="Increase quantity">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
