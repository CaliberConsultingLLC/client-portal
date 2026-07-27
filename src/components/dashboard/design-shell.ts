/**
 * Universal dashboard design shell — the shared foundation every dashboard
 * (any client, any dashboard type or perspective) renders inside:
 *   - left rail  = Views → Reports navigator
 *   - center     = fixed title header + chromeless report content
 *   - right rail = Filters / Context tabs (Filters first / default)
 *
 * These are dashboard-agnostic structural/design decisions. New dashboards and
 * clients should consume this shell so navigation, header format, download
 * placement, and rail behavior stay consistent everywhere.
 *
 * The implementation currently lives with the EE dashboard (its first
 * consumer); it is re-exported here so all dashboards import the SAME component
 * from a neutral, shared path rather than reaching into a client-specific
 * folder. Relocating the implementation file here is a safe future cleanup.
 */
export {
  FieldRedesignShell as DashboardDesignShell,
  type FieldRedesignView as DashboardShellView,
  type FieldRedesignReport as DashboardShellReport,
} from "@/app/employee-experience/dws/field-redesign-shell";

// Shared right-rail / header building blocks that go inside the shell, so every
// dashboard formats its Filters, Context, and header KPIs identically.
export {
  EmbeddedFilterCard,
  FilterStack,
  PillOptionRow,
  HeaderKpiPortal,
} from "@/app/employee-experience/dws/ee-report-kit";
