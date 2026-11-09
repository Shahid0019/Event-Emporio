"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { setKitCatalog, type KitCatalog } from "@/lib/kit/catalog";
import { defaultStoreSettings, type StoreSettings } from "@/lib/settings";
import { sessionStore, type SessionUser } from "@/lib/store";

const SettingsContext = createContext<StoreSettings>(defaultStoreSettings);

/**
 * Hands database-backed store data to browser components: the shop's
 * settings (shipping, contact, payments) and the live kit catalogue.
 */
export function StoreDataProvider({
  settings,
  kitCatalog,
  children,
}: {
  settings: StoreSettings;
  kitCatalog: KitCatalog;
  children: ReactNode;
}) {
  // The kit registry must hold the same catalogue the server rendered with, before any child renders.
  const [applied, setApplied] = useState<KitCatalog | null>(null);
  if (applied !== kitCatalog) {
    setKitCatalog(kitCatalog);
    setApplied(kitCatalog);
  }
  // The remembered sign-in is only a display copy: confirm it with the server once per visit.
  // Coming back from Google, the server leaves a short "hello" cookie: pick up the new sign-in and greet.
  useEffect(() => {
    const hello = document.cookie.split("; ").includes("ee_hello=1");
    if (hello) document.cookie = "ee_hello=; Max-Age=0; path=/";
    if (!sessionStore.get() && !hello) return;
    // Connecting Google from the profile page has its own message there.
    const greet = hello && !window.location.search.includes("google=linked");
    fetch("/api/account/me")
      .then((r) => (r.ok ? (r.json() as Promise<{ user: SessionUser }>) : r.status === 401 ? null : undefined))
      .then((data) => {
        if (data === null) sessionStore.set(null);
        else if (data) {
          sessionStore.set(data.user);
          if (greet) toast.success(`Welcome, ${data.user.name.split(" ")[0]}`, { description: "You're signed in with Google." });
        }
      })
      .catch(() => undefined);
  }, []);

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export const useStoreSettings = () => useContext(SettingsContext);
