import type { CartBundle, CartLine, Paise } from "./types";

/**
 * The cart as the shopper sees it: single products, and kits shown as one
 * item each. Kit items stay separate lines underneath so checkout prices
 * every item on the server as usual.
 */
export type CartEntry =
  | { type: "line"; key: string; line: CartLine }
  | { type: "kit"; key: string; bundle: CartBundle; lines: CartLine[]; total: Paise; pieces: number };

export function groupCart(lines: CartLine[]): CartEntry[] {
  const entries: CartEntry[] = [];
  const kits = new Map<string, Extract<CartEntry, { type: "kit" }>>();
  for (const line of lines) {
    if (!line.bundle) {
      entries.push({ type: "line", key: line.key, line });
      continue;
    }
    let kit = kits.get(line.bundle.id);
    if (!kit) {
      kit = { type: "kit", key: `kit:${line.bundle.id}`, bundle: line.bundle, lines: [], total: 0, pieces: 0 };
      kits.set(line.bundle.id, kit);
      entries.push(kit);
    }
    kit.lines.push(line);
    kit.total += line.unitPrice * line.quantity;
    kit.pieces += line.quantity;
  }
  return entries;
}

/** Items in the bag for badges and headings: each kit counts once; single products by quantity. */
export function cartItemCount(lines: CartLine[]): number {
  return groupCart(lines).reduce((n, e) => n + (e.type === "kit" ? 1 : e.line.quantity), 0);
}
