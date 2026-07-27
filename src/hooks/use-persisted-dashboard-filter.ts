"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  readDashboardFilterBag,
  writeDashboardFilterField,
} from "@/lib/portal/dashboard-filter-cookie";

function resolveInitial<T>(value: T | (() => T)): T {
  return typeof value === "function" ? (value as () => T)() : value;
}

/**
 * Like useState, but restores/saves a named field under a dashboard filter
 * cookie key so returning to a report keeps the last selection.
 */
export function usePersistedDashboardFilter<T>(
  storeKey: string | undefined,
  field: string,
  fallback: T | (() => T)
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const base = resolveInitial(fallback);
    if (!storeKey) return base;
    const saved = readDashboardFilterBag(storeKey)[field];
    return (saved === undefined ? base : (saved as T));
  });

  const storeKeyRef = useRef(storeKey);
  const fieldRef = useRef(field);
  storeKeyRef.current = storeKey;
  fieldRef.current = field;

  useEffect(() => {
    if (!storeKey) return;
    writeDashboardFilterField(storeKey, field, value);
  }, [storeKey, field, value]);

  const setPersisted = useCallback<Dispatch<SetStateAction<T>>>((update) => {
    setValue((previous) => {
      const next = typeof update === "function" ? (update as (prev: T) => T)(previous) : update;
      if (storeKeyRef.current) {
        writeDashboardFilterField(storeKeyRef.current, fieldRef.current, next);
      }
      return next;
    });
  }, []);

  return [value, setPersisted];
}
