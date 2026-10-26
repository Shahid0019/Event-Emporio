"use client";

import Image from "next/image";
import { kitItemById, kitOptionImage, kitProductForItem } from "@/lib/kit/catalog";
import { kitImage } from "@/lib/kit/products";
import { cn } from "@/lib/utils";

/**
 * Small item picture in a 4:5 tile: the product's photo, or its illustration.
 * Pass `variantIndex` to show that option's own photo when the shop added one.
 */
export function KitThumb({
  itemId,
  variantIndex,
  className,
  sizes = "64px",
}: {
  itemId: string;
  variantIndex?: number;
  className?: string;
  /** Rendered width hint for next/image — pass a larger one when the tile is big. */
  sizes?: string;
}) {
  const item = kitItemById(itemId);
  if (!item) return null;
  const image =
    (variantIndex !== undefined ? kitOptionImage(itemId, variantIndex) : undefined) ??
    kitProductForItem(itemId)?.images[0] ??
    kitImage(item);
  const illustration = image.src.endsWith(".svg");
  return (
    <span className={cn("relative block aspect-[4/5] shrink-0 overflow-hidden rounded-chip bg-surface", className)}>
      <Image src={image.src} alt="" fill sizes={sizes} className={cn("object-cover", illustration && "scale-[1.12]")} />
    </span>
  );
}
