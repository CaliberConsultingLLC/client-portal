"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from "react";

export interface RegisteredVisual {
  id: string;
  order: number;
  label: string;
  getNode: () => HTMLElement | null;
}

export interface VisualExportMeta {
  title?: string;
  client?: string;
  filters?: string[];
  logoUrl?: string;
}

interface VisualExportRegistryValue {
  registerVisual: (visual: RegisteredVisual) => () => void;
  getOrderedVisuals: () => RegisteredVisual[];
  setMeta: (meta: VisualExportMeta) => void;
  getMeta: () => VisualExportMeta;
}

const VisualExportRegistryContext =
  createContext<VisualExportRegistryValue | null>(null);

/**
 * Whether the registry is active for the current dashboard. Kept in a separate,
 * lightweight context so toggling it (e.g. when the client scope changes) does
 * not churn the stable registry value below.
 */
const VisualRegistryActiveContext = createContext<boolean>(false);

/**
 * Ref-based registry so registered visuals never trigger re-renders while the
 * dashboard is simply being viewed. Work only happens on export click.
 *
 * `active` turns registration + per-visual export buttons on across every
 * visual that opts in via context. `client` / `logoUrl` are dashboard-level
 * header defaults merged under any per-perspective meta.
 */
export function VisualExportProvider({
  children,
  active = false,
  client,
  logoUrl,
}: {
  children: ReactNode;
  active?: boolean;
  client?: string;
  logoUrl?: string;
}) {
  const visualsRef = useRef<Map<string, RegisteredVisual>>(new Map());
  const metaRef = useRef<VisualExportMeta>({});
  const baseRef = useRef<{ client?: string; logoUrl?: string }>({});
  baseRef.current = { client, logoUrl };

  const registerVisual = useCallback((visual: RegisteredVisual) => {
    visualsRef.current.set(visual.id, visual);
    return () => {
      visualsRef.current.delete(visual.id);
    };
  }, []);

  const getOrderedVisuals = useCallback(
    () => [...visualsRef.current.values()].sort((a, b) => a.order - b.order),
    []
  );

  const setMeta = useCallback((meta: VisualExportMeta) => {
    metaRef.current = meta;
  }, []);

  // Dashboard-level client/logo defaults sit under any per-perspective meta.
  const getMeta = useCallback(
    () => ({ ...baseRef.current, ...metaRef.current }),
    []
  );

  const valueRef = useRef<VisualExportRegistryValue>({
    registerVisual,
    getOrderedVisuals,
    setMeta,
    getMeta,
  });

  return (
    <VisualExportRegistryContext.Provider value={valueRef.current}>
      <VisualRegistryActiveContext.Provider value={active}>
        {children}
      </VisualRegistryActiveContext.Provider>
    </VisualExportRegistryContext.Provider>
  );
}

export function useVisualExportRegistry() {
  return useContext(VisualExportRegistryContext);
}

/** True when the surrounding dashboard has opted every visual into export. */
export function useVisualRegistryActive() {
  return useContext(VisualRegistryActiveContext);
}

/**
 * Declarative way to keep the composite export header in sync with the active
 * view. Render it inside the provider with the current title/filters; it writes
 * to the registry ref on render (side-effect-safe, no state update).
 */
export function VisualExportMetaSetter({
  title,
  filters,
}: {
  title?: string;
  filters?: string[];
}) {
  const registry = useVisualExportRegistry();
  const active = useVisualRegistryActive();
  if (active && registry) {
    registry.setMeta({
      title,
      filters: (filters ?? []).filter((value) => Boolean(value)),
    });
  }
  return null;
}
