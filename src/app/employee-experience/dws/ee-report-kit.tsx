// @ts-nocheck
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { scoreScaleColor } from "@/components/collaboration/score-color-scale";

const EE_REPORT_CSS = `
.canvas{display:block;min-height:calc(100vh - var(--app-top-banner-height,78px) - 66px);background:linear-gradient(90deg,#E8ECE9 0 268px,#fff 268px calc(100% - 268px),#E8ECE9 calc(100% - 268px) 100%);--surface-2:#F1F4F7;--surface-3:#E2E8EF;--border-subtle:#D3DDE7;--border-strong:#8798AA;--text-primary:#152238;--text-secondary:#3B4B63;--text-muted:#6E7E96;--rail:#E8ECE9;--rail-line:#D4DAD6;--ink:#2B2B2B;--nsp-green-500:#6E9B7B}
.rail{position:fixed;top:calc(var(--app-top-banner-height,78px) + 66px);bottom:0;width:268px;overflow:auto;background:var(--rail);padding:26px 22px;z-index:30}.rail.left{left:0;border-right:1px solid var(--rail-line)}.rail.right{right:0;border-left:1px solid var(--rail-line)}
.center{min-height:calc(100vh - var(--app-top-banner-height,78px) - 66px);background:#fff;margin-left:268px;margin-right:268px;padding:30px 30px 56px}.center-inner{max-width:1320px;margin:0 auto}
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
.stmt-wrap{overflow:hidden;border:1px solid var(--border-strong);border-radius:1rem}.stmt-table{width:100%;border-collapse:collapse;font-size:13px}.stmt-table thead th{background:var(--surface-3);text-align:left;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--text-muted);padding:11px 14px;border-bottom:1px solid var(--border-strong)}.stmt-table th.num{text-align:center;width:84px}.stmt-table th.col-group-end,.stmt-table td.col-group-end{border-right:3px solid var(--border-strong)}.stmt-table th.col-group-start,.stmt-table td.col-group-start{border-left:3px solid var(--border-strong)}.stmt-table td{vertical-align:middle}.stmt-table td.stmt{padding:9px 14px;color:var(--text-primary);line-height:1.34}.stmt-table td.cell{padding:6px 8px;text-align:center;font-weight:700;font-size:12.5px;border-top:1px solid var(--border-subtle)}.stmt-row td{border-top:1px solid var(--border-subtle)}.acc-head{cursor:pointer}.acc-head td{background:var(--surface-2);border-top:1px solid var(--border-subtle);padding:9px 14px}.acc-name{display:flex;align-items:center;gap:9px}.acc-chev{width:14px;height:14px;color:var(--text-muted);transition:transform .2s;flex:none}.acc-open .acc-chev{transform:rotate(90deg)}.acc-title{font-size:12.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-primary)}.stmt-sub{padding:7px 14px 7px 30px!important;color:var(--text-secondary);font-weight:500;line-height:1.34;font-size:12.5px}
.ee-heatmap-wrap{overflow:hidden;border:1px solid var(--border-strong);border-radius:1rem}
.seg-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}.seg-rows{display:flex;flex-direction:column;gap:6px}.seg-row{display:grid;grid-template-columns:minmax(120px,32%) 1fr;align-items:center;column-gap:12px;min-height:34px}.seg-name{font-size:12.5px;font-weight:600;color:var(--text-primary);text-align:right;line-height:1.18}.seg-track{position:relative;height:24px;background:var(--surface-2);border-radius:7px;overflow:hidden}.seg-bar{position:absolute;left:0;top:0;bottom:0;border-radius:7px}.seg-val{position:absolute;top:50%;left:10px;transform:translateY(-50%);font-size:12px;font-weight:800;z-index:2}.seg-n{font-size:10px;font-weight:600;color:var(--text-muted);margin-left:6px}.seg-coline{position:absolute;top:-3px;bottom:-3px;width:0;border-left:2px dotted rgba(21,34,56,.55);z-index:2}.coavg-note{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--text-muted);margin:2px 2px 0}.coavg-note .dash{width:18px;border-top:2px dotted rgba(21,34,56,.6)}
.chart{position:relative}.plot{position:relative;padding-top:18px}.grid-overlay{position:absolute;top:18px;bottom:0;left:min(calc(var(--label-col) + 16px),calc(50% + 16px));right:0;pointer-events:none}.bar-row{display:grid;grid-template-columns:minmax(0,min(var(--label-col),50%)) minmax(0,1fr);align-items:center;column-gap:16px;min-height:34px;padding:2px 0}.bar-label{text-align:right;font-size:12.5px;line-height:1.18;color:var(--text-primary);font-weight:500}.track{position:relative;height:24px}.bar{position:absolute;top:50%;transform:translateY(-50%);height:22px;border-radius:0 6px 6px 0;min-width:2px}.val-chip{position:absolute;top:50%;transform:translateY(-50%);z-index:4;font-size:12px;font-weight:700;padding:3px 8px;border-radius:6px;white-space:nowrap;color:#fff}.gridline{position:absolute;top:0;bottom:0;width:0;border-left:1px dashed var(--border-strong)}.axis{position:relative;height:20px;margin-top:4px}.axis .tick{position:absolute;transform:translateX(-50%);font-size:11px;font-weight:600;color:var(--text-muted);top:2px}
.canvas.embedded{background:#fff;min-height:auto}
.canvas.embedded .center{margin-left:0;margin-right:0;min-height:auto;padding:30px 30px 56px}
.canvas.embedded .center-inner{max-width:1320px;margin:0 auto}
@media(max-width:1180px){.canvas{background:linear-gradient(90deg,#E8ECE9 0 248px,#fff 248px 100%)}.rail{width:248px}.rail.right{display:none}.center{margin-left:248px;margin-right:0}}@media(max-width:860px){.canvas{background:#fff}.rail{position:relative;top:auto;bottom:auto;width:auto}.rail.left{left:auto;border-right:0;border-bottom:1px solid var(--rail-line)}.center{margin-left:0;margin-right:0}}@media(max-width:1080px){.seg-grid{grid-template-columns:1fr}}
`;

export function EEReportStyles() {
  return <style>{EE_REPORT_CSS}</style>;
}

export function makeScoreColor(scale) {
  return (value) => scoreScaleColor(value, scale.min, scale.mid, scale.max);
}

export function isLightBand(color) {
  const hex = String(color || "#ffffff").replace("#", "");
  if (hex.length !== 6) return true;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
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
  const logoSrc = client?.logoUrl ?? "/top-flight-logo.png";
  return (
    <div className="tf-mark" aria-label={client?.name}>
      <img src={logoSrc} alt={`${client?.name ?? "Client"} logo`} />
    </div>
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
