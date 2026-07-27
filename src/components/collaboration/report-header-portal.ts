"use client";

import { createContext, useContext } from "react";

/**
 * DOM id of the design-shell header slot that collaboration reports portal
 * their KPI tiles into (average incoming/outgoing, respondents, etc.), so the
 * single shell header carries the headline numbers instead of each report
 * drawing its own boxed hero + duplicate title underneath.
 */
export const COLLAB_HEADER_KPI_SLOT = "collab-header-kpi-slot";

/**
 * When set to the header slot id, ReportSummaryHeader stops rendering its own
 * boxed header and instead portals its metrics into the shell header. Null (the
 * default) keeps the legacy inline header for any non-shell consumer.
 */
export const CollabHeaderPortalContext = createContext<string | null>(null);

export function useCollabHeaderPortal() {
  return useContext(CollabHeaderPortalContext);
}
