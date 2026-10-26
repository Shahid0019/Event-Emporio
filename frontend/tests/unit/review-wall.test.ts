import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReviewWall, type WallReview } from "@/components/home/review-wall";

const review = (i: number): WallReview => ({ id: `r${i}`, name: `Customer ${i}`, rating: 5, text: `Review number ${i} — lovely.` });
const render = (reviews: WallReview[]) => renderToStaticMarkup(createElement(ReviewWall, { reviews }));

describe("home page review wall", () => {
  it("shows nothing without reviews", () => {
    expect(render([])).toBe("");
  });

  it("keeps even one or two reviews scrolling, repeating them to fill each column", () => {
    const html = render([review(1)]);
    expect(html.match(/animate-marquee-up/g)).toHaveLength(6);
    // The review is readable once; its repeats are hidden from screen readers and when the wall is still.
    expect(html).toContain('<li class="motion-reduce:hidden" aria-hidden="true">');
    expect(html.match(/Review number 1 — lovely\./g)!.length).toBeGreaterThan(3);
  });

  it("scrolls many reviews in looping columns: 1 on phones, 2 on tablets, 3 on desktop", () => {
    const html = render(Array.from({ length: 8 }, (_, i) => review(i + 1)));
    // 1 + 2 + 3 columns, each a moving track.
    expect(html.match(/animate-marquee-up/g)).toHaveLength(6);
    // The middle desktop/tablet column runs the other way.
    expect(html.match(/\[animation-direction:reverse\]/g)).toHaveLength(2);
    // The second copy that makes the loop seamless is hidden from screen readers.
    expect(html).toContain('aria-hidden="true" class="flex flex-col gap-6 pb-6 motion-reduce:hidden"');
    // Every review is readable once in each layout.
    for (let i = 1; i <= 8; i++) expect(html).toContain(`Review number ${i} — lovely.`);
  });

  it("pauses only the hovered column, and links each review to its product", () => {
    const html = render([
      { ...review(1), product: "Gilded Rose Mehndi Basket", productSlug: "gilded-rose-mehndi-basket" },
      { ...review(2), product: "Retired Tray" },
      review(3),
      review(4),
    ]);
    // Each moving track pauses itself; nothing pauses the whole wall.
    expect(html.match(/hover:\[animation-play-state:paused\]/g)).toHaveLength(6);
    expect(html).not.toContain("group-hover:[animation-play-state");
    // The product link; repeats in the loop are skipped when tabbing.
    expect(html).toContain('href="/products/gilded-rose-mehndi-basket"');
    expect(html).toMatch(
      /href="\/products\/gilded-rose-mehndi-basket"[^>]*tabindex="-1"|tabindex="-1"[^>]*href="\/products\/gilded-rose-mehndi-basket"/,
    );
    // No address (e.g. no longer sold): the name shows without a link.
    expect(html).toContain("on Retired Tray");
    expect(html).not.toContain('href="/products/undefined"');
  });
});
