import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const base =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-sans font-medium tracking-[0.08em] uppercase transition-[background-color,color,border-color,box-shadow,transform] duration-300 ease-[var(--ease-luxe)] disabled:pointer-events-none disabled:opacity-45 select-none [&_svg]:size-4 [&_svg]:shrink-0";

const variants = {
  primary: "bg-brand text-brand-ink hover:bg-brand-deep active:scale-[0.99]",
  secondary: "border border-ink/80 text-ink hover:bg-ink hover:text-canvas",
  outline: "border border-line-strong text-ink hover:border-ink",
  ghost: "text-ink hover:bg-surface",
  light: "bg-canvas text-ink hover:bg-accent-soft",
  "outline-light": "border border-canvas/70 text-canvas hover:bg-canvas hover:text-ink",
  link: "h-auto px-0 tracking-[0.12em] text-ink link-underline",
  danger: "bg-danger text-white hover:bg-danger/90",
} as const;

const sizes = {
  sm: "h-9 px-4 text-[0.68rem]",
  md: "h-12 px-7 text-[0.72rem]",
  lg: "h-14 px-9 text-[0.75rem]",
  icon: "size-11 p-0 tracking-normal",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], variant !== "link" && sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  loading?: boolean;
};

export function Button({ variant, size, asChild, loading, className, children, disabled, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={buttonVariants({ variant, size, className })}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && (
            <span
              aria-hidden
              className="absolute inset-0 m-auto size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
            />
          )}
          <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
        </>
      )}
    </Comp>
  );
}
