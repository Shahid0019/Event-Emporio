"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny persisted store built on useSyncExternalStore.
 * The server snapshot is always the initial value, so the first client
 * render matches the HTML and React swaps in the stored value right after
 * hydration — no mismatch warnings, no effects.
 */
export function createPersistedStore<T>(key: string, initial: T, validate: (value: unknown) => value is T) {
  let state: T = initial;
  let loaded = false;
  const listeners = new Set<() => void>();

  function load() {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (validate(parsed)) state = parsed;
      }
    } catch {
      // Storage can be unavailable (private mode, blocked cookies) — fall back to memory.
    }
  }

  function persist() {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore quota / privacy errors */
    }
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      loaded = false;
      load();
      listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function get() {
    load();
    return state;
  }

  function set(updater: T | ((prev: T) => T)) {
    load();
    state = typeof updater === "function" ? (updater as (prev: T) => T)(state) : updater;
    persist();
    listeners.forEach((l) => l());
  }

  /** Selectors must return primitives or existing references — never build new arrays/objects here. */
  function useStore<S = T>(selector: (s: T) => S = (s) => s as unknown as S): S {
    return useSyncExternalStore(
      subscribe,
      () => selector(get()),
      () => selector(initial),
    );
  }

  return { get, set, useStore, subscribe };
}

/** In-memory (non-persisted) variant for UI state like open drawers. */
export function createUIStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(updater: T | ((prev: T) => T)) {
      state = typeof updater === "function" ? (updater as (prev: T) => T)(state) : updater;
      listeners.forEach((l) => l());
    },
    useStore<S = T>(selector: (s: T) => S = (s) => s as unknown as S): S {
      return useSyncExternalStore(
        (l) => {
          listeners.add(l);
          return () => listeners.delete(l);
        },
        () => selector(state),
        () => selector(initial),
      );
    },
  };
}

export const isArray = (v: unknown): v is unknown[] => Array.isArray(v);
