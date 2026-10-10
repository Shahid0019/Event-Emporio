"use client";

import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** right = drawer, bottom = mobile sheet, left = menu, center = modal */
  side?: "right" | "left" | "bottom" | "center" | "top";
  hideTitle?: boolean;
  className?: string;
  bodyClassName?: string;
  footer?: ReactNode;
  children: ReactNode;
}

const panel: Record<NonNullable<SheetProps["side"]>, string> = {
  right:
    "inset-y-0 right-0 h-dvh w-full max-w-[28rem] sm:inset-y-2 sm:right-2 sm:h-[calc(100dvh-1rem)] sm:rounded-sheet data-[state=open]:animate-drawer-in",
  left: "inset-y-0 left-0 h-dvh w-full max-w-[24rem] sm:inset-y-2 sm:left-2 sm:h-[calc(100dvh-1rem)] sm:rounded-sheet data-[state=open]:animate-drawer-left",
  bottom: "inset-x-0 bottom-0 max-h-[88dvh] w-full rounded-t-sheet data-[state=open]:animate-sheet-in",
  top: "inset-x-0 top-0 max-h-[90dvh] w-full rounded-b-sheet data-[state=open]:animate-overlay-in",
  center:
    "left-1/2 top-1/2 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-sheet data-[state=open]:animate-overlay-in",
};

/** Accessible dialog primitive (focus trap, Esc, scroll lock) styled as drawer, sheet or modal. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  side = "right",
  hideTitle,
  className,
  bodyClassName,
  footer,
  children,
}: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] data-[state=open]:animate-overlay-in" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            // Prefer an explicitly marked field (e.g. the search input) over the close button.
            const target = (e.currentTarget as HTMLElement).querySelector<HTMLElement>("[data-autofocus]");
            if (target) {
              e.preventDefault();
              target.focus();
            }
          }}
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-canvas shadow-[0_30px_80px_-20px_rgb(36_32_32/0.35)] focus:outline-none",
            panel[side],
            className,
          )}
        >
          <div className={cn("flex items-start justify-between gap-4 border-b border-line px-6 py-5", hideTitle && "sr-only")}>
            <div>
              <Dialog.Title className="font-serif text-2xl leading-tight">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="-mr-2 -mt-1 grid size-10 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-surface"
              aria-label="Close"
            >
              <X className="size-5" strokeWidth={1.5} />
            </Dialog.Close>
          </div>
          <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5", bodyClassName)}>{children}</div>
          {footer && <div className="border-t border-line px-6 py-5">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
