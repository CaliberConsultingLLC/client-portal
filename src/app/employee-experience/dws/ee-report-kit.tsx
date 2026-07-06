// @ts-nocheck
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { scoreScaleColor } from "@/components/collaboration/score-color-scale";

const EE_REPORT_CSS = `
.canvas{display:block;min-height:calc(100vh - var(--app-top-banner-height,78px) - 66px);background:linear-gradient(90deg,#E8ECE9 0 268px,#fff 268px calc(100% - 268px),#E8ECE9 calc(100% - 268px) 100%);overflow-anchor:none;--surface-2:#F1F4F7;--surface-3:#E2E8EF;--border-subtle:#D3DDE7;--border-strong:#8798AA;--text-primary:#152238;--text-secondary:#3B4B63;--text-muted:#6E7E96;--rail:#E8ECE9;--rail-line:#D4DAD6;--ink:#2B2B2B;--nsp-green-500:#6E9B7B}
.rail{position:fixed;top:calc(var(--app-top-banner-height,78px) + 66px);bottom:0;width:268px;overflow:auto;overflow-anchor:none;background:var(--rail);padding:26px 22px;z-index:30}.rail.left{left:0;border-right:1px solid var(--rail-line)}.rail.right{right:0;border-left:1px solid var(--rail-line)}
.center{min-height:calc(100vh - var(--app-top-banner-height,78px) - 66px);background:#fff;margin-left:268px;margin-right:268px;padding:30px 30px 56px;overflow-anchor:none}.center-inner{max-width:1320px;margin:0 auto}
.client-card{background:#fff;border:1px solid var(--border-strong);border-radius:18px;padding:18px 16px 16px;text-align:center;box-shadow:0 1px 3px rgba(15,23,42,.08);margin-bottom:14px}
.tf-mark{position:relative;width:180px;min-height:86px;margin:2px auto 8px;border-radius:14px;background:#fff}.tf-mark img{display:block;width:100%;height:auto;object-fit:contain}
.client-head{font-size:11.5px;font-weight:700;letter-spacing:.1em;color:var(--text-primary);margin-top:12px;line-height:1.35}
.rail-section{background:#fff;border:1px solid var(--border-strong);border-radius:16px;overflow:hidden;margin-bottom:12px}.rs-head{width:100%;display:flex;align-items:center;justify-content:space-between;padding:13px 16px;background:none;border:0;cursor:pointer;text-align:left}.rs-head span{font-size:11.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--text-muted)}.rs-head svg{width:16px;height:16px;color:var(--text-muted);transition:transform .2s}.rail-section.open .rs-head svg{transform:rotate(90deg)}.rs-body{border-top:1px solid var(--border-subtle);padding:12px 14px 14px}.rs-stack{display:flex;flex-direction:column;gap:9px}
.toggle-btn,.index-btn{width:100%;text-align:center;padding:11px 12px;border-radius:11px;cursor:pointer;font-size:13px;font-weight:600;border:1px solid var(--rail-line);background:#fff;color:var(--text-secondary);transition:all .16s}.toggle-btn:hover,.index-btn:hover{border-color:#B9C4B7;color:var(--ink)}.toggle-btn.active,.index-btn.active{background:var(--ink);color:#fff;border-color:var(--ink);box-shadow:0 1px 3px rgba(15,23,42,.08)}
.rail-select{width:100%;padding:11px 14px;border-radius:11px;cursor:pointer;font-size:12.5px;font-weight:600;line-height:1.3;font-family:inherit;border:1px solid var(--rail-line);background:#fff;color:var(--text-secondary)}.rs-hint{font-size:11px;line-height:1.45;color:var(--text-muted);margin:9px 2px 0}
.rail-meta{background:#fff;border:1px solid var(--border-strong);border-radius:16px;padding:16px}.rail-meta h4{margin:0 0 10px;font-size:11.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--text-muted)}
.rail-insights{display:flex;flex-direction:column;gap:12px;margin-bottom:14px}.rail-ins{display:flex;align-items:flex-start;gap:11px;border:1px solid var(--border-strong);border-radius:16px;padding:13px 14px;background:#fff}.pip{width:34px;height:34px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12.5px}.ins-label{font-size:9.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--text-muted)}.ins-text{font-size:12px;line-height:1.4;color:var(--text-primary);margin-top:3px;font-weight:600}
.card{border:1px solid var(--border-strong);background:#fff;border-radius:1rem;box-shadow:7px 9px 20px rgba(15,23,42,.09),2px 3px 6px rgba(15,23,42,.05);overflow:hidden}.card-head{padding:22px 24px 0}.card-title{font-size:18px;font-weight:700;letter-spacing:-.01em;color:var(--text-primary);margin:0}.card-body{padding:18px 24px 24px}.slabel{font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--text-muted);margin:0}
.hero{border:1px solid var(--border-strong);border-radius:1rem;background:linear-gradient(135deg,#fff 0%,var(--surface-2) 55%,rgba(238,243,248,.5) 100%);box-shadow:0 1px 3px rgba(15,23,42,.08);padding:20px 24px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap}.hero h2{margin:4px 0 0;font-size:27px;font-weight:800;letter-spacing:-.02em;color:var(--text-primary)}.hero-sub{margin:5px 0 0;font-size:14px;font-weight:600;color:var(--text-secondary)}.kpi-strip{display:flex;gap:10px;flex-wrap:wrap}.kpi{min-width:104px;min-height:76px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:10px 14px;border-radius:16px;border:1px solid var(--border-strong);background:rgba(255,255,255,.85)}.k-label{font-size:9.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--text-muted)}.k-value{font-size:25px;font-weight:800;line-height:1;margin-top:6px;color:var(--text-primary)}
.stmt-wrap{overflow:hidden;border:1px solid var(--border-strong);border-radius:1rem}.stmt-table{width:100%;border-collapse:collapse;font-size:13px}.stmt-table thead th{background:var(--surface-3);text-align:left;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--text-muted);padding:11px 14px;border-bottom:1px solid var(--border-strong)}.stmt-table th.num{text-align:center;width:84px}.stmt-table th.col-group-end,.stmt-table td.col-group-end{border-right:3px solid var(--border-strong)}.stmt-table th.col-group-start,.stmt-table td.col-group-start{border-left:3px solid var(--border-strong)}.stmt-table td{vertical-align:middle}.stmt-table td.stmt{padding:9px 14px;color:var(--text-primary);line-height:1.34}.stmt-table td.cell{padding:6px 8px;text-align:center;font-weight:800;font-size:12.5px;border-top:1px solid var(--border-subtle)}.stmt-row td{border-top:1px solid var(--border-subtle)}.acc-head{cursor:pointer}.acc-head td{background:var(--surface-2);border-top:1px solid var(--border-subtle);padding:9px 14px}.acc-name{display:flex;align-items:center;gap:9px}.acc-chev{width:14px;height:14px;color:var(--text-muted);transition:transform .2s;flex:none}.acc-open .acc-chev{transform:rotate(90deg)}.acc-title{font-size:12.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-primary)}.stmt-sub{padding:7px 14px 7px 30px!important;color:var(--text-secondary);font-weight:500;line-height:1.34;font-size:12.5px}
.ee-heatmap-wrap{overflow:hidden;border:1px solid var(--border-strong);border-radius:1rem}
.seg-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}.seg-rows{display:flex;flex-direction:column;gap:6px}.seg-row{display:grid;grid-template-columns:minmax(120px,32%) 1fr;align-items:center;column-gap:12px;min-height:34px}.seg-name{font-size:12.5px;font-weight:600;color:var(--text-primary);text-align:right;line-height:1.18}.seg-track{position:relative;height:24px;background:var(--surface-2);border-radius:7px;overflow:hidden}.seg-bar{position:absolute;left:0;top:0;bottom:0;border-radius:7px}.seg-val{position:absolute;top:50%;left:10px;transform:translateY(-50%);font-size:12px;font-weight:800;z-index:2}.seg-n{font-size:10px;font-weight:600;color:var(--text-muted);margin-left:6px}.seg-coline{position:absolute;top:-3px;bottom:-3px;width:0;border-left:2px dotted rgba(21,34,56,.55);z-index:2}.coavg-note{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--text-muted);margin:2px 2px 0}.coavg-note .dash{width:18px;border-top:2px dotted rgba(21,34,56,.6)}
.chart{position:relative}.plot{position:relative;padding-top:18px}.grid-overlay{position:absolute;top:18px;bottom:0;left:min(calc(var(--label-col) + 16px),calc(50% + 16px));right:0;pointer-events:none}.bar-row{display:grid;grid-template-columns:minmax(0,min(var(--label-col),50%)) minmax(0,1fr);align-items:center;column-gap:16px;min-height:34px;padding:2px 0}.bar-label{text-align:right;font-size:12.5px;line-height:1.18;color:var(--text-primary);font-weight:500}.track{position:relative;height:24px}.bar{position:absolute;top:50%;transform:translateY(-50%);height:22px;border-radius:0 6px 6px 0;min-width:2px}.val-chip{position:absolute;top:50%;transform:translateY(-50%);z-index:4;font-size:12px;font-weight:700;padding:3px 8px;border-radius:6px;white-space:nowrap;color:#fff}.gridline{position:absolute;top:0;bottom:0;width:0;border-left:1px dashed var(--border-strong)}.axis{position:relative;height:20px;margin-top:4px}.axis .tick{position:absolute;transform:translateX(-50%);font-size:11px;font-weight:600;color:var(--text-muted);top:2px}
.canvas.embedded{background:#fff;min-height:auto}
.canvas.embedded .center{margin-left:0;margin-right:0;min-height:auto;padding:30px 30px 56px}
.canvas.embedded .center-inner{max-width:1320px;margin:0 auto}
.canvas.no-right-rail{background:linear-gradient(90deg,#E8ECE9 0 268px,#fff 268px 100%)}
.canvas.no-right-rail .center{margin-right:30px}
@media(max-width:1180px){.canvas{background:linear-gradient(90deg,#E8ECE9 0 248px,#fff 248px 100%)}.rail{width:248px}.rail.right{display:none}.center{margin-left:248px;margin-right:0}}@media(max-width:860px){.canvas{background:#fff}.rail{position:relative;top:auto;bottom:auto;width:auto}.rail.left{left:auto;border-right:0;border-bottom:1px solid var(--rail-line)}.center{margin-left:0;margin-right:0}}@media(max-width:1080px){.seg-grid{grid-template-columns:1fr}}
`;

export function EEReportStyles() {
  return <style>{EE_REPORT_CSS}</style>;
}

// Basin group ONLY (surface/elevation treatment "1b") — shared by Basin
// Report, Basin Breakdown, and Basin Comparison. Scoped entirely under the
// `.basin-surface-1b` wrapper class so `.card`/`.stmt-wrap`/`.ee-heatmap-wrap`
// keep their normal hard `#8798AA` border everywhere else — every other report
// that renders `<EEReportStyles />` never gets this wrapper class, so it's
// visually unaffected. `!important` matches the specificity of the other
// scoped overrides already layered on these same classes elsewhere (e.g.
// FieldRedesignShell's `.fr-embed .stmt-wrap` box-shadow rule) so this wins
// regardless of DOM/style-tag ordering.
//
// NOTE: these panels are the data-visual containers (chart cards, statement
// table, heatmap) — they stay WHITE so they pop with depth against the tinted
// `#F4F4EF` canvas around them. Border color matches the same slight blue
// used by the active Index Rail tab (#8798AA) at the same 1px weight, so
// every panel reads as one consistent family of "framed" visuals; the softer
// elevation shadow (vs. the harder default shadow elsewhere) is unchanged.
const BASIN_SURFACE_1B_CSS = `
.basin-surface-1b .card,
.basin-surface-1b .stmt-wrap,
.basin-surface-1b .ee-heatmap-wrap {
  border: 1px solid rgba(135,152,170,0.7) !important;
  box-shadow: 0 2px 12px rgba(15,23,42,0.24), 0 1px 3px rgba(15,23,42,0.20) !important;
  background: #fff !important;
}
`;

export function BasinSurfaceStyles() {
  return <style>{BASIN_SURFACE_1B_CSS}</style>;
}

// Basin group (Basin Report / Basin Breakdown / Basin Comparison) ONLY:
// section subtitles run vertically in a narrow rail to the left of the
// section instead of a horizontal line above it, vertically centered
// against the section's own height. Reuses the existing `.slabel` look
// (size/weight/tracking/color) — just rotated. Shared across the whole
// Basin group so all three reports read as one consistent set; every other
// report keeps the plain horizontal `.slabel` line above its sections.
export function VerticalSectionLabel({ label, style }: { label: string; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, flexShrink: 0, ...style }}>
      <span className="slabel" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap", textDecoration: "underline" }}>
        {label}
      </span>
    </div>
  );
}

// Positions the vertical label in the existing left gutter (outside the
// section's own content/frame) without shifting or resizing that content —
// `wrapStyle` sets the relative-positioned box the label is measured against.
export function SectionWithVerticalLabel({
  label,
  active = true,
  wrapStyle,
  children,
}: {
  label: string;
  active?: boolean;
  wrapStyle?: CSSProperties;
  children: ReactNode;
}) {
  if (!active) return <>{children}</>;
  return (
    <div style={{ position: "relative", marginLeft: 22, ...wrapStyle }}>
      <VerticalSectionLabel label={label} style={{ position: "absolute", left: -44, top: 0, bottom: 0 }} />
      {children}
    </div>
  );
}

export function makeScoreColor(scale) {
  return (value) => scoreScaleColor(value, scale.min, scale.mid, scale.max);
}

// Shared yellow #D7B35A → white → blue #3F5F86 gradient over an arbitrary [min,max] domain.
// `min` renders full yellow, the midpoint renders white, and `max` renders full blue.
export function makeGradientColor(min: number, max: number) {
  const span = max - min || 1;
  return (value: number | null | undefined): string => {
    if (value == null || !Number.isFinite(value as number)) return "#F8FAFC";
    const t = Math.max(0, Math.min(1, ((value as number) - min) / span));
    let r: number, g: number, b: number;
    if (t <= 0.5) {
      const s = t / 0.5;
      r = Math.round(215 + (255 - 215) * s);
      g = Math.round(179 + (255 - 179) * s);
      b = Math.round(90 + (255 - 90) * s);
    } else {
      const s = (t - 0.5) / 0.5;
      r = Math.round(255 + (63 - 255) * s);
      g = Math.round(255 + (95 - 255) * s);
      b = Math.round(255 + (134 - 255) * s);
    }
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  };
}

// DWS-wide score color: yellow → white → blue, default display range 60–85.
export const dwsScoreColor = makeGradientColor(60, 85);

// DWS raw-score color: same gradient mapped onto the EE Likert scale (6–8.5).
export const dwsRawScoreColor = makeGradientColor(6, 8.5);

const DWS_T = "#2A3040";
// DWS-wide delta scale: toned-down green #59885D / red #D46A6A, all dark text
export function dwsDeltaStyle(d: number): { bg: string; text: string } {
  if (d >= 5)     return { bg: "#59885D", text: DWS_T };
  if (d >= 2.5)   return { bg: "#8DB494", text: DWS_T };
  if (d >= 0.5)   return { bg: "#C6DCC8", text: DWS_T };
  if (d >= 0.05)  return { bg: "#EAF3EB", text: DWS_T };
  if (d <= -4)    return { bg: "#D46A6A", text: DWS_T };
  if (d <= -2)    return { bg: "#D98B8B", text: DWS_T };
  if (d <= -0.05) return { bg: "#F5E5E5", text: DWS_T };
  return { bg: "#E8ECF0", text: DWS_T };
}

export function isLightBand(color) {
  const hex = String(color || "#ffffff").replace("#", "");
  if (hex.length !== 6) return true;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

// The exact attached-tab index rail used by the Basin Report (field layout).
// Extracted verbatim so every field-layout visual that needs an index picker
// (Basin Report's chart, Segment Breakdown, …) shares one implementation.
export function IndexRailTabs({
  indexes,
  activeId,
  onSelect,
  compact = false,
  surfaceTreatment,
}: {
  indexes: Array<{ id: string; name: string }>;
  activeId: string;
  onSelect: (id: string) => void;
  compact?: boolean;
  /** @deprecated no longer changes fill — the active tab and its attached
   * chart card are both white so the data visual pops against the tinted
   * canvas. Kept as a no-op prop so existing call sites don't need updating. */
  surfaceTreatment?: "1b";
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, width: compact ? 150 : 168, flexShrink: 0, paddingTop: compact ? 12 : 22, paddingBottom: compact ? 12 : 22 }}>
      {indexes.map((index, indexIndex) => {
        const active = index.id === activeId;
        return (
          <button
            key={index.id}
            type="button"
            onClick={() => onSelect(index.id)}
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: compact ? "0 10px" : "0 12px",
              borderTopLeftRadius: 12,
              borderBottomLeftRadius: 12,
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              cursor: "pointer",
              fontSize: compact ? 12 : 13,
              lineHeight: 1.15,
              transition: "all .16s",
              position: "relative",
              marginBottom: indexIndex === indexes.length - 1 ? 0 : -1,
              ...(active
                ? {
                    background: "#fff",
                    color: "#1E2329",
                    fontWeight: 800,
                    border: "1px solid #8798AA",
                    borderRight: "none",
                    marginRight: -1,
                    zIndex: 2,
                    boxShadow: "-1px 0 3px rgba(15,23,42,.05)",
                  }
                : {
                    // Same header-band blue used by table/heatmap headers
                    // (var(--surface-3) / var(--text-muted)) — every "header
                    // box" style (tab rail, table head, heatmap head) reads
                    // as one consistent color instead of three near-misses.
                    background: "var(--surface-3)",
                    color: "var(--text-muted)",
                    fontWeight: 700,
                    border: "1px solid #D4DAD6",
                    zIndex: 1,
                  }),
            }}
          >
            {index.name}
          </button>
        );
      })}
    </div>
  );
}

// Module-level shared canvas for text measurement — created once and reused
// across every render/call instead of allocating a new canvas per measurement.
let sharedMeasureCanvas: HTMLCanvasElement | null = null;
const measureLabelWidth = (text: string, font: string): number => {
  if (typeof document === "undefined") {
    // SSR fallback heuristic — client will recompute correctly on hydration.
    return text.length * 6.2;
  }
  if (!sharedMeasureCanvas) sharedMeasureCanvas = document.createElement("canvas");
  const ctx = sharedMeasureCanvas.getContext("2d");
  if (!ctx) return text.length * 6.2;
  ctx.font = font;
  return ctx.measureText(text).width;
};

const LABEL_COL_MIN = 90;
const LABEL_COL_SINGLE_LINE_CAP = 240;
const LABEL_COL_MAX = 360;
const LABEL_COL_PADDING = 16;
const LABEL_FONT = "500 12.5px Montserrat, Inter, sans-serif";

// The exact "compare rows to an org/company line" horizontal bar chart used
// by the Basin Report (BrandComparisonChart). Extracted verbatim so every
// report that needs this chart — Basin Report, Basin Comparison, Department
// Comparison — shares one implementation instead of near-duplicate copies
// that can drift apart visually.
export function BrandComparisonChart({ rows, axis, scoreColor, uniform = false, compact = false, showOrgLine = true }) {
  const pct = (value) => ((Math.max(axis.min, Math.min(axis.max, value)) - axis.min) / (axis.max - axis.min)) * 100;

  // Dynamic label-column width, sized from the actual row labels: short
  // labels (e.g. "North Dakota") get a narrow column that hands more room
  // to the bars, while long survey-statement sentences get a wide column
  // (up to the export-mode ceiling) so they wrap across at most ~2 lines
  // instead of clipping inside a fixed 280px column.
  const labelCol = useMemo(() => {
    const naturalMax = rows.reduce((max, row) => Math.max(max, measureLabelWidth(row.name, LABEL_FONT)), 0);
    const raw =
      naturalMax <= LABEL_COL_SINGLE_LINE_CAP
        ? Math.max(LABEL_COL_MIN, Math.min(LABEL_COL_SINGLE_LINE_CAP, naturalMax + LABEL_COL_PADDING))
        : Math.max(LABEL_COL_SINGLE_LINE_CAP, Math.min(LABEL_COL_MAX, Math.ceil(naturalMax / 2) + LABEL_COL_PADDING));
    return Math.ceil(raw / 4) * 4;
  }, [rows]);

  return (
    <div className="chart" style={{ "--label-col": `${labelCol}px`, "--gap-col": "140px" }}>
      <style>{`
        .br-track{height:24px;background:#F1F4F7;border-radius:0 7px 7px 0;position:relative}
        .br-bar{position:absolute;left:0;top:0;bottom:0;border-radius:0 7px 7px 0}
        .br-chip{position:absolute;left:8px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.95);color:#152238;border:1px solid rgba(21,34,56,.16);font-size:12px;font-weight:800;padding:3px 8px;border-radius:6px}
        .br-org{position:absolute;top:2px;bottom:2px;width:0;border-left:2.5px solid rgba(21,34,56,.55);z-index:5}
        .br-org-dot{position:absolute;top:50%;width:16px;height:16px;border-radius:999px;background:#152238;border:2px solid #fff;transform:translate(-50%,-50%);box-shadow:0 1px 3px rgba(0,0,0,.32);z-index:6}
        .br-row{display:grid;grid-template-columns:minmax(0,min(var(--label-col),50%)) minmax(0,1fr) var(--gap-col);align-items:center;column-gap:16px;min-height:34px;padding:2px 0}
        .br-plot-uniform{display:flex;flex-direction:column;gap:14px}
        .br-plot-uniform .br-row{min-height:0;height:44px;padding:0}
        .br-plot-uniform .br-track{height:32px}
        .br-plot-uniform .bar-label{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.15}
        .br-plot-uniform.br-plot-compact{gap:8px}
        .br-plot-uniform.br-plot-compact .br-row{height:28px}
        .br-plot-uniform.br-plot-compact .br-track{height:20px}
        .br-plot-uniform.br-plot-compact .br-chip{font-size:11px;padding:1px 6px}
        .br-plot-uniform.br-plot-compact .br-org-dot{width:12px;height:12px}
        .br-plot-uniform.br-plot-compact .bar-label{font-size:13px}
        /* Export-only: widen the label column so long statements fit on one/two lines
           without clipping, and let rows grow to fit wrapped labels. html-to-image
           paints through the real browser, so native grid align-items:center handles
           all vertical centering (labels, bars, chips, pills) exactly as on screen —
           no manual positioning hacks needed. */
        .ee-export-mode .chart{--label-col:360px !important;--gap-col:130px !important}
        .ee-export-mode .br-plot-uniform .br-row{height:auto !important;min-height:56px !important}
        .ee-export-mode .br-plot-uniform .bar-label{-webkit-line-clamp:unset !important;-webkit-box-orient:horizontal !important;display:block !important;overflow:visible !important;white-space:normal !important}
        .br-axis-row{display:grid;grid-template-columns:minmax(0,min(var(--label-col),50%)) minmax(0,1fr) var(--gap-col);align-items:center;column-gap:16px;padding:0}
        .br-head-row{display:grid;grid-template-columns:minmax(0,min(var(--label-col),50%)) minmax(0,1fr) var(--gap-col);align-items:center;column-gap:16px;padding:0;margin-bottom:8px}
        .br-gap-col{display:flex;align-items:center;justify-content:center;padding-left:10px}
        .br-gap-head{text-align:center;padding-left:10px;font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#6E7E96}
        .br-gap-pill{min-width:96px;padding:4px 10px;border-radius:999px;text-align:center;font-size:13px;font-weight:800;border:1px solid}
        .br-plot-compact .br-gap-pill{padding:2px 10px;font-size:12px;min-width:84px}
      `}</style>
      {/* Same 3-column grid as every data row below (label / bars / gap) so
          "Diff - DWS" always sits centered directly over the delta pills,
          by construction, instead of a hand-placed header label that can
          drift out of alignment as the label column resizes. */}
      <div className="br-head-row"><div /><div /><div className="br-gap-head">Diff - DWS</div></div>
      <div className={`plot${uniform ? " br-plot-uniform" : ""}${compact ? " br-plot-compact" : ""}`}>
        <div className="grid-overlay" style={{ right: "var(--gap-col)" }}>
          {axis.ticks.map((tick) => <div key={tick} className="gridline" style={{ left: `${pct(tick)}%` }} />)}
        </div>
        {rows.map((row) => {
          const color = scoreColor(row.value);
          const gapTone = row.delta >= 0
            ? { bg: "#DCEFE2", fg: "#2F6A45", border: "#9BC6A9" }
            : { bg: "#F4DEDD", fg: "#8A3D3A", border: "#D5A3A0" };
          return (
            <div className="br-row" key={row.id}>
              <div className="bar-label" title={row.name} style={{ whiteSpace: "normal" }}>{row.name}</div>
              <div className="br-track">
                <div className="br-bar" style={{ width: `${pct(row.value)}%`, background: color, outline: "1px solid rgba(0,0,0,0.18)" }}>
                  <div className="br-chip">{row.value.toFixed(1)}</div>
                </div>
                {showOrgLine ? (
                  <>
                    <div className="br-org" style={{ left: `${pct(row.org)}%` }} />
                    <div className="br-org-dot" style={{ left: `${pct(row.org)}%` }} />
                  </>
                ) : null}
              </div>
              <div className="br-gap-col">
                <div className="br-gap-pill" style={{ background: gapTone.bg, color: gapTone.fg, borderColor: gapTone.border }}>
                  {f1(row.delta)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="br-axis-row"><div /><div className="axis">{axis.ticks.map((tick) => <div key={tick} className="tick" style={{ left: `${pct(tick)}%` }}>{tick}</div>)}</div><div /></div>
    </div>
  );
}

export function deltaStyle(d) {
  if (d >= 6) return { bg: "#8BA399", text: "#FFFFFF" };
  if (d >= 4) return { bg: "#9CB2A8", text: "#FFFFFF" };
  if (d >= 2) return { bg: "#B5C5BE", text: "#1F332A" };
  if (d >= 0.05) return { bg: "#E2E9E5", text: "#355348" };
  if (d <= -3) return { bg: "#B49F9C", text: "#FFFFFF" };
  if (d <= -1) return { bg: "#C8B9B6", text: "#4E3834" };
  if (d <= -0.05) return { bg: "#E8DFDE", text: "#5E4441" };
  return { bg: "#E2E8EF", text: "#3B4B63" };
}

export const f1 = (n) => (n >= 0 ? "+" : "") + n.toFixed(1);
export const mean = (arr) => arr.reduce((sum, value) => sum + value, 0) / arr.length;
export const round1 = (n) => Math.round(n * 10) / 10;

export const EE_BORDER_STRONG = "#8798AA";
export const EE_PANEL_CLASS =
  "overflow-hidden rounded-2xl border border-[#8798AA] bg-white shadow-[7px_9px_20px_rgba(15,23,42,0.09),2px_3px_6px_rgba(15,23,42,0.05)]";

export function defaultComparisonId(comparisons) {
  return comparisons[comparisons.length - 1]?.id ?? comparisons[0]?.id ?? "";
}

export function computeDeltaAxis(rows, fallback = { min: -10, max: 10 }) {
  if (!rows.length) {
    return { min: fallback.min, max: fallback.max, ticks: [fallback.min, 0, fallback.max] };
  }

  const maxAbs = Math.max(...rows.map((row) => Math.abs(row.delta)), 1);
  const bound = Math.max(5, Math.ceil(maxAbs / 5) * 5);
  const min = Math.min(fallback.min, -bound);
  const max = Math.max(fallback.max, bound);
  const ticks = [min, 0, max];

  return { min, max, ticks };
}

export function clampDeltaVisual(delta, axis) {
  return Math.max(axis.min, Math.min(axis.max, delta));
}

const MONTHS_3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LOOKUP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export function campMonthYear(campaign) {
  const source = String(campaign?.labelLong || campaign?.label || campaign?.short || "");
  const trimmed = source.trim();
  const lowered = trimmed.toLowerCase();

  // Numeric date formats like 3/15/2025.
  const slash = trimmed.match(/^(\d{1,2})\/\d{1,2}\/((?:19|20)?\d{2})$/);
  if (slash) {
    const monthIndex = Math.max(0, Math.min(11, Number(slash[1]) - 1));
    const rawYear = slash[2];
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return { mon: MONTHS_3[monthIndex], year };
  }

  // Formats like Aug-24, August-24.
  const monthYear = lowered.match(/^([a-z]+)-((?:19|20)?\d{2})$/);
  if (monthYear && MONTH_LOOKUP[monthYear[1]] != null) {
    const rawYear = monthYear[2];
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return { mon: MONTHS_3[MONTH_LOOKUP[monthYear[1]]], year };
  }

  // Formats like 24-Aug or 24-August.
  const yearMonth = lowered.match(/^((?:19|20)?\d{2})-([a-z]+)$/);
  if (yearMonth && MONTH_LOOKUP[yearMonth[2]] != null) {
    const rawYear = yearMonth[1];
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return { mon: MONTHS_3[MONTH_LOOKUP[yearMonth[2]]], year };
  }

  const monMatch = lowered.match(/\b([a-z]+)\b/);
  const monthIndex = monMatch ? MONTH_LOOKUP[monMatch[1]] : undefined;
  const mon = monthIndex != null ? MONTHS_3[monthIndex] : "";
  const y4 = trimmed.match(/\b(?:19|20)\d{2}\b/);
  const y2 = trimmed.match(/\b(\d{2})\b/);
  return { mon, year: y4?.[0] ?? (y2 ? `20${y2[1]}` : "") };
}

export function DateHead({ campaign }) {
  const { mon, year } = campMonthYear(campaign);
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1.08 }}>
      <span>{mon}</span>
      <span style={{ fontWeight: 600, opacity: 0.68, marginTop: 1 }}>{year}</span>
    </span>
  );
}

export function Chevron() {
  return <ChevronRight className="h-4 w-4" />;
}

// Redesign-pilot filter styling: a flat, always-visible card (no expand/collapse)
// showing every option as a clickable pill, per the DWS Field layout redesign.
// Selected/hover colors intentionally match the top nav bar (AppTopBanner, dark
// tone): gold #D7B35A when active, green #386B45 on hover — see the `fr-pill`
// CSS rules injected by FieldRedesignShell (!important so they win over these
// inline base styles for the active/hover states).
export function pillButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: "5px 12px",
    borderRadius: 99,
    fontSize: 11.5,
    fontWeight: 600,
    cursor: "pointer",
    border: active ? "1px solid #D7B35A" : "1px solid #D4DAD6",
    background: active ? "#D7B35A" : "#F5F7F5",
    color: active ? "#242424" : "#3B4B63",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  };
}

export function EmbeddedFilterCard({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderRadius: 13, border: "1px solid #C8D2CF", background: "#fff", padding: "14px 13px" }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          marginBottom: open ? 9 : 0,
        }}
      >
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8798AA" }}>
          {title}
        </span>
        <ChevronDown
          style={{
            width: 14,
            height: 14,
            color: "#8798AA",
            flexShrink: 0,
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : undefined,
          }}
        />
      </button>
      {open ? children : null}
    </div>
  );
}

export function PillOptionRow({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-[6px]">
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`fr-pill${active ? " fr-pill-active" : ""}`}
            style={pillButtonStyle(active)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function RailSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rail-section${open ? " open" : ""}`}>
      <button type="button" className="rs-head" onClick={() => setOpen((value) => !value)}>
        <span>{title}</span>
        <Chevron />
      </button>
      {open ? <div className="rs-body">{children}</div> : null}
    </div>
  );
}

export function ClientMark({ client }) {
  const logoSrc = client?.logoUrl ?? "/deep-well-services-logo.png";
  return (
    <div className="tf-mark" aria-label={client?.name}>
      <img src={logoSrc} alt={`${client?.name ?? "Client"} logo`} />
    </div>
  );
}

// Portals a report's KPI strip into the layout-redesign shell's header, next
// to the report title. Used by every chromeless report so the shell header
// carries the headline numbers instead of each report drawing its own boxed
// hero underneath a duplicate title. Inline styles (not the shared .kpi/.kpi-strip
// classes) are required because the target DOM node lives outside `.canvas`,
// so CSS custom properties scoped there aren't inherited.
export function HeaderKpiPortal({
  items,
  portalId,
  surfaceTreatment,
}: {
  items: Array<{ label: string; value: string; color?: string }>;
  portalId?: string;
  /** Basin group ONLY (surface treatment "1b"): same slight-blue border at
   * 70% opacity + doubled soft shadow used by every other Basin panel.
   * Every other consumer leaves this unset and keeps the hard border. */
  surfaceTreatment?: "1b";
}) {
  const [node, setNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!portalId) {
      setNode(null);
      return;
    }
    setNode(document.getElementById(portalId));
  }, [portalId]);

  if (!portalId || !node || items.length === 0) return null;

  return createPortal(
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            minWidth: 104,
            minHeight: 76,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "10px 14px",
            borderRadius: 16,
            border: surfaceTreatment === "1b" ? "1px solid rgba(135,152,170,0.7)" : "1px solid #8798AA",
            background: "#F5F7F8",
            boxShadow:
              surfaceTreatment === "1b"
                ? "0 2px 12px rgba(15,23,42,0.24), 0 1px 3px rgba(15,23,42,0.20)"
                : "7px 9px 20px rgba(15,23,42,.09), 2px 3px 6px rgba(15,23,42,.05)",
          }}
        >
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6E7E96" }}>
            {item.label}
          </div>
          <div style={{ fontSize: 25, fontWeight: 800, lineHeight: 1, marginTop: 6, color: item.color ?? "#152238" }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>,
    node
  );
}

export function InsightCard({ value, title, children, tone = "neutral" }) {
  const [open, setOpen] = useState(false);
  const color = tone === "positive" ? "#9CB2A8" : tone === "negative" ? "#C8B9B6" : "#3B4B63";

  return (
    <div className="rail-ins" style={{ borderColor: tone === "neutral" ? "#8798AA" : `${color}66` }}>
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        className="flex w-full items-start gap-3 text-left"
      >
        <span className="pip" style={{ background: color, color: "#fff" }}>{value}</span>
        <span className="min-w-0 flex-1">
          <span className="ins-label" style={{ color }}>{title}</span>
          {open ? <span className="ins-text block">{children}</span> : null}
        </span>
      </button>
    </div>
  );
}
