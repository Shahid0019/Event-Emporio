"use client";

import { createPersistedStore, isArray } from "../store/create-store";
import { newId } from "../utils";
import { activeLines, kitTotal, type KitLine } from "./buildKit";
import { giftLines, giftsTotal } from "./gifts";
import { kitCartLabels } from "./cart";
import { decodeSharedKit, encodeSharedKit, type SharedKit } from "./shared";
import { kitStore, loadCompleteKit } from "./store";

/**
 * Kits the shopper saved for later, kept in this browser. Each one stores
 * the whole kit (same format as kit links), so it reopens exactly — prices
 * are always recalculated from the current catalogue.
 */
export interface SavedKit {
  id: string;
  name: string;
  summary: string;
  kit: string;
  /** Total when saved, for the list; the reopened kit shows today's price. */
  total: number;
  savedAt: string;
}

export const SAVED_KITS_MAX = 12;

export const savedKitsStore = createPersistedStore<SavedKit[]>("ee.kit.saved.v1", [], isArray as (v: unknown) => v is SavedKit[]);

/** Saves (or updates, if it was saved before) the current kit. Returns its id. */
export function saveKitForLater(kit: SharedKit, lines: KitLine[], existingId?: string): string {
  const { name, summary } = kitCartLabels(kit, activeLines(lines).length);
  const existing = existingId ? savedKitsStore.get().find((k) => k.id === existingId) : undefined;
  const id = existing?.id ?? newId("saved");
  const entry: SavedKit = {
    id,
    name,
    summary,
    kit: encodeSharedKit(kit),
    total: kitTotal(lines) + giftsTotal(giftLines(kit.gifts)),
    savedAt: new Date().toISOString(),
  };
  savedKitsStore.set((list) => [entry, ...list.filter((k) => k.id !== id)].slice(0, SAVED_KITS_MAX));
  kitStore.set((s) => ({ ...s, savedId: id }));
  return id;
}

export function openSavedKit(id: string): boolean {
  const saved = savedKitsStore.get().find((k) => k.id === id);
  const kit = decodeSharedKit(saved?.kit);
  if (!kit) return false;
  loadCompleteKit(kit, { savedId: id });
  return true;
}

export const deleteSavedKit = (id: string) => savedKitsStore.set((list) => list.filter((k) => k.id !== id));
