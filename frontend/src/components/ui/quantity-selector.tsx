"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max,
  size = "md",
  label = "Quantity",
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  size?: "sm" | "md";
  label?: string;
  className?: string;
}) {
  const btn = cn(
    "grid place-items-center rounded-full text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:text-line-strong disabled:hover:bg-transparent",
    size === "sm" ? "size-9" : "size-12",
  );
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center overflow-hidden rounded-full border border-line-strong bg-raised", className)}
    >
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity">
        <Minus className="size-3.5" />
      </button>
      <output aria-live="polite" className={cn("text-center text-sm tabular-nums", size === "sm" ? "w-8" : "w-10")}>
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
