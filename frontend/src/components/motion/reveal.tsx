"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Scroll-triggered reveal. Content is visible in the server HTML; GSAP only
 * animates it in once the script runs, so a failed or blocked script never
 * hides anything. Disabled entirely for reduced-motion users.
 * With `stagger`, children marked `data-reveal` animate in sequence.
 */
export function Reveal({
  children,
  className,
  stagger,
  y = 32,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const targets = stagger ? gsap.utils.toArray<HTMLElement>("[data-reveal]", el) : [el];
        if (!targets.length) return;
        gsap.from(targets, {
          autoAlpha: 0,
          y,
          duration: 1.1,
          ease: "power3.out",
          stagger: stagger ?? 0,
          delay,
          clearProps: "transform,opacity,visibility",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Gentle scroll-linked drift for editorial imagery (desktop, motion-allowed only). */
export function Parallax({ children, className, amount = 8 }: { children: ReactNode; className?: string; amount?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const inner = el.firstElementChild;
      if (!inner) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 768px)", () => {
        gsap.fromTo(
          inner,
          { yPercent: -amount / 2, scale: 1.08 },
          {
            yPercent: amount / 2,
            scale: 1.08,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
