"use client";

import { Accordion as A } from "radix-ui";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Accordion({
  items,
  defaultValue,
  className,
}: {
  items: { id: string; title: ReactNode; content: ReactNode }[];
  defaultValue?: string;
  className?: string;
}) {
  return (
    <A.Root type="single" collapsible defaultValue={defaultValue} className={cn("border-t border-line", className)}>
      {items.map((item) => (
        <A.Item key={item.id} value={item.id} className="border-b border-line">
          <A.Header>
            <A.Trigger className="group flex w-full items-center justify-between gap-6 py-5 text-left text-[0.95rem] font-medium text-ink transition-colors hover:text-brand">
              {item.title}
              <Plus
                aria-hidden
                className="size-4 shrink-0 text-muted transition-transform duration-300 ease-[var(--ease-luxe)] group-data-[state=open]:rotate-45"
              />
            </A.Trigger>
          </A.Header>
          <A.Content className="overflow-hidden text-[0.95rem] leading-relaxed text-muted data-[state=closed]:animate-none">
            <div className="pb-6 pr-8">{item.content}</div>
          </A.Content>
        </A.Item>
      ))}
    </A.Root>
  );
}
