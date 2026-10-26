"use client";

import { useRouter } from "next/navigation";
import { createContext, createElement, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { saveAdminChanges } from "@/app/admin/actions";
import { diffAdminData, hasChanges, type AdminData } from "../admin-data";
import { buildKitCatalog, setKitCatalog } from "../kit/catalog";

/**
 * Admin data on the client. The admin layout loads everything from the
 * database and passes it to <AdminDataProvider>. Screens read it with
 * `adminStore.useStore()` and change it with `updateAdmin(draft => …)`:
 * the change shows immediately, then only what changed is saved on the
 * server. If the save fails the screen goes back and says why.
 */

export type { AdminData, StockMovement } from "../admin-data";

const AdminDataContext = createContext<AdminData | null>(null);

// Latest data and the save function, for event handlers outside React render.
let latest: AdminData | null = null;
let mutateFn: ((mutator: (draft: AdminData) => void) => Promise<boolean>) | null = null;

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const adminStore = {
  /** Current admin data (inside admin pages). */
  useStore<S = AdminData>(selector?: (data: AdminData) => S): S {
    const data = useContext(AdminDataContext);
    if (!data) throw new Error("adminStore.useStore must be used inside the admin");
    return selector ? selector(data) : (data as unknown as S);
  },
  /** Latest data, for click handlers. */
  get(): AdminData {
    if (!latest) throw new Error("Admin data isn't loaded yet");
    return latest;
  },
};

/** Change admin data; resolves to true once the server has saved it. */
export function updateAdmin(mutator: (draft: AdminData) => void): Promise<boolean> {
  if (!mutateFn) {
    toast.error("Still loading — please try again in a moment.");
    return Promise.resolve(false);
  }
  return mutateFn(mutator);
}

export function AdminDataProvider({ initial, children }: { initial: AdminData; children: ReactNode }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [base, setBase] = useState(initial);
  // Fresh data from the server (after a save or navigation) replaces the local copy.
  if (initial !== base) {
    setBase(initial);
    setData(initial);
  }
  const dataRef = useRef(data);

  // The kit tools in the admin use the same live kit catalogue as the shop.
  const [catalogFor, setCatalogFor] = useState<AdminData | null>(null);
  if (catalogFor !== data) {
    setKitCatalog(buildKitCatalog(data.products, data.kitFunctions));
    setCatalogFor(data);
  }

  useLayoutEffect(() => {
    dataRef.current = data;
    latest = data;
  }, [data]);

  useLayoutEffect(() => {
    mutateFn = async (mutator) => {
      const before = dataRef.current;
      const after = clone(before);
      mutator(after);
      const changes = diffAdminData(before, after);
      if (!hasChanges(changes)) return true;

      dataRef.current = after;
      latest = after;
      setData(after);
      const result = await saveAdminChanges(changes);
      if (!result.ok) {
        dataRef.current = before;
        latest = before;
        setData(before);
        toast.error("Not saved", { description: result.error });
        return false;
      }
      router.refresh();
      return true;
    };
    return () => {
      mutateFn = null;
    };
  }, [router]);

  return createElement(AdminDataContext.Provider, { value: data }, children);
}
