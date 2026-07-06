"use client";

/**
 * FieldRedesignShell — ISOLATED pilot chrome for the DWS Field Employee
 * Experience dashboard ONLY. Rendered exclusively when clientScope.key ===
 * "dws-field" AND the ?layout=redesign flag is set. It does not modify any
 * shared component; every other dashboard renders exactly as before.
 *
 * Layout model (see design_handoff_dashboard_layout/README.md):
 *  - single dark top bar stays (the shared AppTopBanner, rendered by the layout)
 *  - the white "dashboard ribbon" is gone
 *  - left rail = Views → Reports accordion navigator (collapsible to 44px)
 *  - center = in-content title header + the report content (rendered chromeless)
 *  - right rail = Context / Filters tabs (collapsible to 44px)
 *
 * Colors, fonts, and the actual visualizations are unchanged — this is layout
 * and navigation only.
 */

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  SlidersHorizontal,
} from "lucide-react";
import { SilentVisualExportFrame, VisualExportButtonStyleProvider } from "@/components/dashboard/registered-visual-export-frame";

export interface FieldRedesignReport {
  id: string;
  label: string;
  /** Draw a thin divider above this report in the left-rail list, splitting
   * it apart from the ones above within the same view (e.g. Comparison
   * reports set apart from a Report/Breakdown pair). */
  dividerBefore?: boolean;
}

export interface FieldRedesignView {
  id: string;
  label: string;
  perspectives: FieldRedesignReport[];
}

interface FieldRedesignShellProps {
  clientName: string;
  logoUrl?: string;
  /** Left-rail identity block, line 2: the dashboard's name, e.g. "Field Employee Experience". */
  clientSubline?: string;
  /** Left-rail identity block, line 3: the active campaign, e.g. "Jun 2026". */
  campaignLabel?: string;
  /** Eyebrow above the report title, e.g. "EXECUTIVE & HR · FALL 2024". */
  eyebrow?: string;
  /** The active report title shown as the content <h1>. */
  reportTitle: string;
  views: FieldRedesignView[];
  activeViewId: string;
  activeReportId: string;
  onSelectReport: (viewId: string, reportId: string) => void;
  exportSlot?: React.ReactNode;
  contextSlot: React.ReactNode;
  filtersSlot: React.ReactNode;
  children: React.ReactNode;
  /**
   * DOM id for a slot rendered inline in the title header, between the h1 and
   * the export button. Used only by reports (e.g. Basin Report) that portal
   * their own KPI summary up into the single top header instead of rendering
   * a second, boxed-in hero inside the content area.
   */
  headerExtraSlotId?: string;
  /** Thicker bottom divider under the title header — used for reports that
   * consolidated a second header into this one, to give it a bit more weight. */
  thickerHeaderDivider?: boolean;
  /**
   * DOM id for an inline slot appended right after the report title, e.g. so
   * Basin Report can show "Basin Report — East Texas" for whatever's selected.
   */
  titleSuffixSlotId?: string;
  /**
   * Basin Report ONLY (surface/elevation treatment "1b"): tints the center
   * canvas a faint warm gray instead of white, drops the header gradient
   * wash + heavy divider in favor of a soft 1px line, and lets the report
   * body's own panels render with a soft-edge/elevation look instead of a
   * hard border. Every other report leaves this unset and renders exactly
   * as before.
   */
  basinReportSurface?: boolean;
}

const RADIUS_CARD = 16;
// Height of the experimental header framing gradient (field-redesign-shell
// header). The wash now sits ABOVE the header's divider line, inside/above
// the title block itself, so this is sized to the header row's own height
// rather than the report content below it.
const GRADIENT_HEIGHT = 140;

// DESIGN RULE — title header is a fixed height everywhere it renders, not a
// height that grows/shrinks with whatever happens to be portaled into
// `headerExtraSlotId` (a pair of KPI chips, one chip, a view-switcher pill
// row, or nothing at all). 76 matches the KPI chip's own `minHeight` (see
// HeaderKpiPortal / the inline KPI chips in ee-department-report.tsx), so a
// report WITH chips sets the standard and every other report — regardless of
// what it puts up there, including nothing — reads at that same height.
// Switching between perspectives in the same dashboard must never shift this
// row. Apply this same fixed-header-height rule anywhere this shell (or its
// eventual portal-wide successor) renders a title header.
const HEADER_ROW_MIN_HEIGHT = 76;

function ClientAvatar({ logoUrl, clientName }: { logoUrl?: string; clientName: string }) {
  if (logoUrl) {
    return (
      <div
        className="mx-auto overflow-hidden"
        style={{ width: 150, height: 68 }}
      >
        <img
          src={logoUrl}
          alt={`${clientName} logo`}
          className="h-full w-full object-contain"
          style={{ objectPosition: "center" }}
        />
      </div>
    );
  }
  const initials = clientName
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      className="mx-auto flex items-center justify-center font-extrabold"
      style={{
        width: 40,
        height: 40,
        borderRadius: 11,
        background: "linear-gradient(135deg,#E8CC70,#C99A3C)",
        color: "#242424",
        fontSize: 15,
      }}
    >
      {initials || "C"}
    </div>
  );
}

export function FieldRedesignShell({
  clientName,
  logoUrl,
  clientSubline,
  campaignLabel,
  eyebrow,
  reportTitle,
  views,
  activeViewId,
  activeReportId,
  onSelectReport,
  exportSlot,
  contextSlot,
  filtersSlot,
  children,
  headerExtraSlotId,
  thickerHeaderDivider = false,
  titleSuffixSlotId,
  basinReportSurface = false,
}: FieldRedesignShellProps) {
  const [leftExpanded, setLeftExpanded] = useState(true);
  const [rightExpanded, setRightExpanded] = useState(true);
  const [rightTab, setRightTab] = useState<"context" | "filters">("context");
  const [openViewId, setOpenViewId] = useState<string | null>(activeViewId);

  // Keep the active view's group open when the report changes from elsewhere.
  useEffect(() => {
    setOpenViewId(activeViewId);
  }, [activeViewId]);

  // DESIGN RULE: the title header's divider line sits at a fixed position on
  // the page, identical across every report/perspective — never a function
  // of where the PREVIOUS report happened to leave the scroll position.
  // This one scroll container is shared/persistent across every perspective
  // (only `children` swaps out below the header when you click a new
  // report), so without this reset, scrolling down in a tall report like
  // Basin Report and then switching to a shorter one like Basin Breakdown
  // left the header rendered mid-scroll — appearing to "jump" even though
  // its actual height/position within the content column never changed.
  const centerScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    centerScrollRef.current?.scrollTo({ top: 0 });
  }, [activeReportId]);

  const leftWidth = leftExpanded ? 260 : 44;
  const rightWidth = rightExpanded ? 260 : 44;

  // The underlying client-scope data label carries a trailing "Field" suffix
  // (e.g. "Deep Well Services — Field") so the app can route to this dashboard's
  // data scope. That's an internal routing detail, not part of the client's
  // actual name — strip it for display; "Field Employee Experience" already
  // covers which dashboard this is on the line below.
  const displayClientName = clientName.replace(/\s*[—-]?\s*field\s*$/i, "").trim() || clientName;

  return (
    <div
      style={{
        height: "calc(100vh - var(--app-top-banner-height, 78px))",
        display: "flex",
        overflow: "hidden",
        background: "#EEF2EE",
        position: "relative",
      }}
    >
      {/* Scoped rules: render the report content chromeless (hide its baked-in
          fixed rails, neutralize its 268px margins) WITHOUT touching the shared
          report component's live view. Only applies inside .fr-embed. */}
      <style>{`
        /* Content is rendered inside an extra export-target wrapper div, so a
           report's own root (className="block" or "canvas", carrying the old
           grey/white striped page background + full-viewport min-height) sits
           one level deeper than .fr-embed's direct child. Reset both depths so
           every report type is caught regardless of which one applies to it. */
        .fr-embed > div, .fr-embed > div > div { display: block !important; background: #fff !important; min-height: 0 !important; }
        .fr-embed aside { display: none !important; }
        /* The header framing wash (thickerHeaderDivider gradient) paints
           behind the whole center column, not just behind .fr-embed's own
           children — so any transparent gap in a report's own top-of-page
           markup (a bare label, a flex row with no wrapping background, a
           margin before its first card, etc.) lets the wash show through
           into what should read as a plain white visual. Giving .fr-embed
           itself an opaque white background closes that off in one place
           for every report, regardless of each report's internal DOM: this
           paints as a solid floor under the whole embed before any of its
           descendants render, so it fully blocks the gradient (which lives
           in an isolated, lower stacking position one level up) for the
           entire report area, while the ~22px gap between the header
           divider and .fr-embed itself is left alone so the wash still
           reads there, which is the only place it's meant to show. */
        .fr-embed { background: #fff; }
        /* padding:0 matters as much as the margin reset here: several report
           types (comparisons, Detailed Results, Heat Maps) keep the shared
           30px page padding on their <main> even once chromeless, while
           report-style perspectives (Basin/Department Report) already zero
           it — that mismatch is what made comparisons look "thinner" than
           reports. Zeroing it everywhere lets each report's own inner
           max-width wrapper be the only thing controlling width, so every
           perspective lines up edge-to-edge. */
        .fr-embed main { margin-left: 0 !important; margin-right: 0 !important; padding: 0 !important; min-height: 0 !important; }
        .fr-embed .canvas { background: #fff !important; }
        /* Basin Report ONLY (surface treatment "1b"): the report's own root
           carries a faint warm-gray tint instead of white. This needs to be
           at least as specific as the two white-forcing rules above (both
           !important) so it actually wins — the extra "fr-embed-basin"
           class on the same element does that, and the rule order/specificity
           makes the win independent of where these two style blocks land in
           the document. Every other report never gets this class, so its
           .fr-embed keeps the plain white rules above untouched. */
        .fr-embed-basin.fr-embed { background: #F4F4EF; }
        .fr-embed-basin.fr-embed > div, .fr-embed-basin.fr-embed > div > div, .fr-embed-basin.fr-embed .canvas { background: #F4F4EF !important; }
        /* Every panel in the report body should carry the same light shadow as
           the chart card above it — the shared .stmt-wrap/.ee-heatmap-wrap
           classes don't have one, so statement tables and heatmaps look flat
           by comparison. Scoped to this pilot only. */
        .fr-embed .stmt-wrap, .fr-embed .ee-heatmap-wrap {
          box-shadow: 7px 9px 20px rgba(15,23,42,.09), 2px 3px 6px rgba(15,23,42,.05);
        }
        /* Some perspectives (Campaign Overview, Detailed History, ENPS) wrap
           their content in a plain <div> using the same margin-reserving
           style as <main> elsewhere, so it isn't caught by the ".fr-embed main"
           reset below — without this, hiding the old fixed rail leaves the
           content squeezed into the old center column. */
        .fr-embed .fr-persp-main { margin: 0 !important; padding: 0 !important; }
        .fr-view-scroll::-webkit-scrollbar { width: 8px; }
        .fr-view-scroll::-webkit-scrollbar-thumb { background: #C7D0D8; border-radius: 99px; }

        /* Views accordion + filter pills: match the top nav bar's interaction
           colors — gold #D7B35A when selected, green #386B45 on hover. */
        .fr-view-head:hover:not(.fr-view-head-active) { background: #386B45 !important; }
        .fr-view-head:hover:not(.fr-view-head-active) .fr-view-label,
        .fr-view-head:hover:not(.fr-view-head-active) .fr-view-count,
        .fr-view-head:hover:not(.fr-view-head-active) .fr-view-chev { color: #fff !important; }
        .fr-view-head:hover:not(.fr-view-head-active) .fr-view-count { background: rgba(255,255,255,0.22) !important; }
        .fr-view-head-active { background: #D7B35A !important; }
        .fr-view-head-active .fr-view-label { color: #242424 !important; }
        .fr-view-head-active .fr-view-count { background: rgba(36,36,36,0.14) !important; color: #242424 !important; }
        .fr-view-head-active .fr-view-chev { color: #242424 !important; }

        .fr-pill:hover:not(.fr-pill-active) { background: #386B45 !important; border-color: #386B45 !important; color: #fff !important; }
        .fr-pill-active { background: #D7B35A !important; border-color: #D7B35A !important; color: #242424 !important; }
      `}</style>

      {/* ───────── LEFT RAIL — report navigator ─────────
          Outer wrapper stays un-clipped (position:relative, no overflow) so the
          edge-toggle button below can sit fully on top instead of being sliced
          in half by the inner rail's overflow:hidden. */}
      <div
        style={{
          width: leftWidth,
          flexShrink: 0,
          position: "relative",
          transition: "width 0.32s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#E8ECE9",
          borderRight: "1px solid #8798AA",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {leftExpanded ? (
          <div
            className="fr-view-scroll"
            style={{
              width: 260,
              flex: 1,
              overflowY: "auto",
              padding: "16px 13px 60px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Client card — logo only */}
            <div
              style={{
                borderRadius: RADIUS_CARD,
                border: "1px solid #8798AA",
                background: "#fff",
                padding: 14,
                textAlign: "center",
                boxShadow: "0 1px 3px rgba(15,23,42,0.07)",
                flexShrink: 0,
              }}
            >
              <ClientAvatar logoUrl={logoUrl} clientName={clientName} />
            </div>

            {/* Identity block: client / dashboard / campaign, freestanding (no
                card chrome) directly on the rail background, below the logo. */}
            <div style={{ textAlign: "center", padding: "0 4px", flexShrink: 0 }}>
              <p
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "#152238",
                  lineHeight: 1.3,
                }}
              >
                {displayClientName}
              </p>
              {clientSubline ? (
                <p style={{ fontSize: 12.5, fontWeight: 600, color: "#3B4B63", marginTop: 4 }}>
                  {clientSubline}
                </p>
              ) : null}
              {campaignLabel ? (
                <p style={{ fontSize: 11.5, fontWeight: 500, color: "#8798AA", marginTop: 4 }}>
                  {campaignLabel}
                </p>
              ) : null}
            </div>

            {/* Views label */}
            <div style={{ padding: "2px 2px 0", flexShrink: 0 }}>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#8798AA",
                }}
              >
                Views
              </span>
            </div>

            {/* Views accordion — each View is its own bordered card so groups read
                as visually distinct units, not just a background-tint difference. */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {views.map((view) => {
                const containsActive = view.perspectives.some((r) => r.id === activeReportId);
                const open = openViewId === view.id;
                return (
                  <div
                    key={view.id}
                    style={{
                      borderRadius: 12,
                      border: containsActive ? "1px solid #D7B35A" : "1px solid #D9DFDA",
                      borderLeft: containsActive ? "3px solid #D7B35A" : "1px solid #D9DFDA",
                      background: "#fff",
                      overflow: "hidden",
                      transition: "border-color 0.15s",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenViewId((prev) => (prev === view.id ? null : view.id))}
                      className={`fr-view-head${containsActive ? " fr-view-head-active" : ""}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 11px",
                        cursor: "pointer",
                        width: "100%",
                        border: "none",
                        transition: "all 0.15s",
                      }}
                    >
                      <span
                        className="fr-view-label"
                        style={{
                          flex: 1,
                          textAlign: "left",
                          fontSize: 11.5,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: containsActive ? "#152238" : "#3B4B63",
                        }}
                      >
                        {view.label}
                      </span>
                      <span
                        className="fr-view-count"
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#8798AA",
                          background: "#EEF1EE",
                          borderRadius: 99,
                          padding: "1px 7px",
                        }}
                      >
                        {view.perspectives.length}
                      </span>
                      <ChevronDown
                        className="fr-view-chev"
                        style={{
                          width: 14,
                          height: 14,
                          color: "#8798AA",
                          transition: "transform 0.2s",
                          transform: open ? "rotate(180deg)" : undefined,
                        }}
                      />
                    </button>
                    {open ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          padding: "2px 8px 8px",
                          borderTop: "1px solid #EEF1EE",
                        }}
                      >
                        {view.perspectives.map((report) => {
                          const isActive = report.id === activeReportId;
                          return (
                            <div key={report.id}>
                              {report.dividerBefore ? (
                                <div style={{ height: 1, background: "#E4E9E5", margin: "6px 4px" }} />
                              ) : null}
                              <button
                                type="button"
                                onClick={() => onSelectReport(view.id, report.id)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 9,
                                  padding: "8px 10px",
                                  borderRadius: 9,
                                  cursor: "pointer",
                                  width: "100%",
                                  textAlign: "left",
                                  marginTop: 6,
                                  background: isActive ? "#fff" : "transparent",
                                  border: isActive ? "1px solid #8798AA" : "1px solid transparent",
                                  boxShadow: isActive ? "0 1px 3px rgba(15,23,42,0.08)" : "none",
                                  transition: "all 0.15s",
                                }}
                              >
                                <span
                                  style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: 99,
                                    background: isActive ? "#C99A3C" : "#C8D2CF",
                                    flexShrink: 0,
                                    display: "block",
                                  }}
                                />
                                <span
                                  style={{
                                    flex: 1,
                                    fontSize: 12,
                                    fontWeight: isActive ? 700 : 600,
                                    color: isActive ? "#152238" : "#59675C",
                                  }}
                                >
                                  {report.label}
                                </span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div
            style={{
              width: 44,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "16px 0",
              gap: 10,
            }}
          >
            <div
              className="overflow-hidden"
              style={{ width: 30, height: 30, borderRadius: 9, background: "#fff", border: "1px solid #C8D2CF", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
              ) : (
                <span style={{ fontSize: 10, fontWeight: 800, color: "#242424" }}>
                  {clientName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ width: 20, height: 1, background: "#C8D2CF" }} />
            <button
              type="button"
              title="Views & reports"
              onClick={() => setLeftExpanded(true)}
              style={{ width: 30, height: 30, borderRadius: 9, background: "#fff", border: "1px solid #C8D2CF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#59675C" }}
            >
              <PanelLeft style={{ width: 15, height: 15 }} />
            </button>
          </div>
        )}
      </div>

        {/* Edge toggle — sibling of the clipped rail, not a descendant, so it
            renders as a full circle layered on top instead of being sliced by
            the rail's own overflow:hidden. */}
        <div style={{ position: "absolute", right: -15, top: "50%", transform: "translateY(-50%)", zIndex: 20 }}>
          <button
            type="button"
            onClick={() => setLeftExpanded((v) => !v)}
            style={{ width: 30, height: 30, borderRadius: 99, background: "#fff", border: "1px solid #8798AA", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(15,23,42,0.14)", color: "#3B4B63" }}
          >
            {leftExpanded ? <ChevronLeft style={{ width: 16, height: 16 }} /> : <ChevronRight style={{ width: 16, height: 16 }} />}
          </button>
        </div>
      </div>

      {/* ───────── CENTER ───────── */}
      <div
        ref={centerScrollRef}
        className="fr-view-scroll"
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden", background: basinReportSurface ? "#F4F4EF" : "#fff", minWidth: 0 }}
      >
        <div style={{ padding: "22px 28px 52px", maxWidth: 1320, margin: "0 auto" }}>
          {/* Title header (replaces the removed ribbon). Only the title/KPI
              row itself is registered for export — the decorative gradient
              and the export button are deliberately left out of the
              captured node: the gradient has no natural end point in a
              flat, stacked export (it just becomes dead space), and
              interactive chrome should never be rendered into a PNG at all,
              not merely hidden, to avoid the extra capture cost. */}
          <div style={{ position: "relative", isolation: "isolate" }}>
            <SilentVisualExportFrame order={-100} label="Header">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 16,
                  rowGap: 16,
                  marginBottom: 22,
                  minHeight: HEADER_ROW_MIN_HEIGHT,
                  padding: "0 22px 18px",
                  borderBottom: basinReportSurface
                    ? "3px solid #8798AA"
                    : thickerHeaderDivider
                      ? "3px solid #1E3A5F"
                      : "1px solid #EEF1EE",
                }}
              >
                <div style={{ minWidth: 0, alignSelf: basinReportSurface ? "flex-end" : undefined }}>
                  {eyebrow ? (
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "#8798AA",
                        marginBottom: 6,
                      }}
                    >
                      {eyebrow}
                    </p>
                  ) : null}
                  <h1
                    style={{
                      fontSize: basinReportSurface ? 28 : 25,
                      fontWeight: 800,
                      color: basinReportSurface ? "#0B1424" : "#152238",
                      letterSpacing: "-0.02em",
                      lineHeight: 1.1,
                    }}
                  >
                    {reportTitle}
                    {titleSuffixSlotId ? <span id={titleSuffixSlotId} /> : null}
                  </h1>
                </div>
                {/* Right-justified against the divider's edge. */}
                {headerExtraSlotId ? (
                  <div id={headerExtraSlotId} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", flexShrink: 0, gap: 12 }} />
                ) : null}
              </div>
            </SilentVisualExportFrame>

            {/* Export button — a sibling of the registered header, not a
                descendant, so it's never part of the exported image. */}
            {exportSlot ? (
              <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 6, zIndex: 5 }}>
                {exportSlot}
              </div>
            ) : null}

            {/* Experimental framing wash: purely a live-page visual effect,
                not part of the export (see note above). Sits ABOVE the
                divider line — anchored to the bottom of this header block
                (right at the line) and fading upward — so it never extends
                past the line into the report content below, and therefore
                can't bleed into any data visual. */}
            {thickerHeaderDivider && !basinReportSurface ? (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: GRADIENT_HEIGHT,
                  zIndex: -1,
                  pointerEvents: "none",
                  background:
                    "linear-gradient(180deg, rgba(30,58,95,0) 0%, rgba(30,58,95,0.07) 55%, rgba(30,58,95,0.16) 100%)",
                }}
              />
            ) : null}
          </div>

          {/* Report content, rendered chromeless */}
          <div className={basinReportSurface ? "fr-embed fr-embed-basin" : "fr-embed"}>
            {/* Every report inside the redesign shell gets the small,
                icon-only corner download button instead of the labeled pill
                that pulls out below the visual — applies across the whole
                pilot, not just Basin Report. Reports rendered outside this
                shell (Collaboration, Integration Effectiveness, the classic
                DWS/CSG layouts) never see this provider, so they keep the
                original pill button untouched. */}
            <VisualExportButtonStyleProvider value="corner">{children}</VisualExportButtonStyleProvider>
          </div>
        </div>
      </div>

      {/* ───────── RIGHT RAIL — Context / Filters ─────────
          Same un-clipped outer wrapper pattern as the left rail, so the edge
          toggle isn't sliced by the inner rail's overflow:hidden. */}
      <div
        style={{
          width: rightWidth,
          flexShrink: 0,
          position: "relative",
          transition: "width 0.32s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#E8ECE9",
          borderLeft: "1px solid #8798AA",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Both the expanded panel and the collapsed icon rail mount always;
            toggle visibility via CSS `display` instead of conditionally
            rendering. The expanded panel holds `filtersSlot`/`contextSlot`,
            which each perspective portals its own filter/context content
            into via a one-time `document.getElementById` effect on mount —
            unmounting that panel on collapse (the old behavior) tore the
            portal target out of the DOM, and remounting it on re-expand
            created a brand-new DOM node that the already-mounted report
            component's effect never re-queried for (its effect deps don't
            change on rail collapse/expand), so the filter/context content
            silently failed to (re)appear until the user switched to a
            different perspective and the effect ran fresh. Keeping this
            panel permanently mounted removes that race entirely. */}
        <div style={{ width: 260, display: rightExpanded ? "flex" : "none", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          <div style={{ display: "flex", flexShrink: 0, background: "#DDE3DE", borderBottom: "1px solid #D4DAD6" }}>
            {(["context", "filters"] as const).map((tab) => {
              const active = rightTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setRightTab(tab)}
                  style={{
                    flex: 1,
                    padding: "11px 0",
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    border: "none",
                    borderBottom: active ? "2px solid #2F9151" : "2px solid transparent",
                    background: active ? "#fff" : "transparent",
                    color: active ? "#152238" : "#6E7E96",
                    transition: "all 0.18s",
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>
          <div className="fr-view-scroll" style={{ flex: 1, overflowY: "auto", padding: "14px 12px 60px" }}>
            {/* Both mount always; toggle visibility so portal targets stay alive. */}
            <div style={{ display: rightTab === "context" ? "block" : "none" }}>{contextSlot}</div>
            <div style={{ display: rightTab === "filters" ? "block" : "none" }}>{filtersSlot}</div>
          </div>
        </div>
        <div
          style={{ width: 44, flex: 1, display: rightExpanded ? "none" : "flex", flexDirection: "column", alignItems: "center", padding: "18px 0", gap: 8 }}
        >
          <button
            type="button"
            title="Context"
            onClick={() => { setRightTab("context"); setRightExpanded(true); }}
            style={{ width: 30, height: 30, borderRadius: 9, background: "#fff", border: "1px solid #C8D2CF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#3B4B63" }}
          >
            <BarChart3 style={{ width: 15, height: 15 }} />
          </button>
          <div style={{ width: 20, height: 1, background: "#C8D2CF" }} />
          <button
            type="button"
            title="Filters"
            onClick={() => { setRightTab("filters"); setRightExpanded(true); }}
            style={{ width: 30, height: 30, borderRadius: 9, background: "#fff", border: "1px solid #C8D2CF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#3B4B63" }}
          >
            <SlidersHorizontal style={{ width: 15, height: 15 }} />
          </button>
        </div>
      </div>

        {/* Edge toggle — sibling of the clipped rail, layered fully on top. */}
        <div style={{ position: "absolute", left: -15, top: "50%", transform: "translateY(-50%)", zIndex: 20 }}>
          <button
            type="button"
            onClick={() => setRightExpanded((v) => !v)}
            style={{ width: 30, height: 30, borderRadius: 99, background: "#fff", border: "1px solid #8798AA", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(15,23,42,0.14)", color: "#3B4B63" }}
          >
            {rightExpanded ? <ChevronRight style={{ width: 16, height: 16 }} /> : <ChevronLeft style={{ width: 16, height: 16 }} />}
          </button>
        </div>
      </div>
    </div>
  );
}
