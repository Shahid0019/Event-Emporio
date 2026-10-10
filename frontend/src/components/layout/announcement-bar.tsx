"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  message: string;
  href?: string;
}

/** Admin-managed announcements. Rotates gently when there's more than one; pauses on hover/focus. */
export function AnnouncementBar({ items }: { items: Announcement[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (items.length < 2 || paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % items.length), 6000);
    return () => window.clearInterval(id);
  }, [items.length, paused]);

  if (!items.length) return null;

  return (
    <div
      className="relative z-50 bg-brand-deep text-brand-ink"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="container-luxe grid h-9 place-items-center text-center">
        {items.map((item, i) => {
          const content = <span className="line-clamp-1 text-[0.7rem] tracking-[0.14em] uppercase">{item.message}</span>;
          return (
            <div
              key={item.id}
              aria-hidden={i !== index}
              className={cn(
                "col-start-1 row-start-1 transition-opacity duration-700",
                i === index ? "opacity-100" : "pointer-events-none invisible opacity-0",
              )}
            >
              {item.href ? (
                <Link href={item.href} tabIndex={i === index ? 0 : -1} className="underline-offset-4 hover:underline">
                  {content}
                </Link>
              ) : (
                content
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
