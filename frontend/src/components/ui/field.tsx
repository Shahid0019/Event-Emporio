import type { ComponentProps, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-control border border-line-strong bg-raised px-4 text-[0.95rem] text-ink placeholder:text-muted/70 transition-colors duration-200 hover:border-muted focus:border-ink focus:outline-none focus-visible:outline-none focus:ring-1 focus:ring-ink aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-70";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-32 py-3 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(control, "h-12 cursor-pointer appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-2 block text-[0.8rem] font-medium tracking-wide text-ink", className)} {...props} />;
}

interface FieldProps {
  label: ReactNode;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

/** Label + control + hint/error, with ids wired for screen readers. */
export function Field({ label, htmlFor, error, hint, optional, className, children }: FieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1.5 font-normal text-muted">(optional)</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-[0.8rem] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-[0.8rem] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Spreads the ARIA attributes a control needs to reference its Field error/hint. */
export function fieldAria(id: string, error?: string, hasHint?: boolean) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hasHint ? `${id}-hint` : undefined,
  } as const;
}

export function Checkbox({ className, label, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("group relative flex cursor-pointer items-start gap-3 text-[0.9rem] leading-snug", className)}>
      <input
        type="checkbox"
        className="peer mt-0.5 size-[1.05rem] shrink-0 cursor-pointer appearance-none rounded-[5px] border border-line-strong bg-raised transition-colors checked:border-brand checked:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        {...props}
      />
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="pointer-events-none absolute mt-0.5 size-[1.05rem] fill-none stroke-brand-ink stroke-2 opacity-0 peer-checked:opacity-100"
      >
        <path d="M4 8.5l2.5 2.5L12 5.5" />
      </svg>
      <span className="text-ink">{label}</span>
    </label>
  );
}
