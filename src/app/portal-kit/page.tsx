"use client";

// ─── Portal Kit gallery ───────────────────────────────────────────────────────
// A static, growing visual reference of the named artifacts in
// `src/components/portal-kit`. Bookmark /portal-kit and refer to visuals by the
// names shown here (e.g. "IndexTabRail", "ScoreBarChart", "StatementHeatmap").
// This page is presentation-only; it uses sample data, never live client data.

import { Fragment, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  PanelLeft,
  SlidersHorizontal,
} from "lucide-react";
import {
  IndexTabRail,
  ScoreBarChart,
  StatementHeatmap,
  makeScoreColor,
  readableText,
  KIT_BORDER,
  KIT_PANEL_SHADOW,
} from "@/components/portal-kit";

const SCALE = { min: 50, max: 75 };
const scoreColor = makeScoreColor(SCALE.min, SCALE.max);
const BAR_AXIS = { min: 45, max: 80, ticks: [50, 60, 70, 80] };

const INDEXES = [
  { id: "safety", label: "Safety & Wellbeing" },
  { id: "equip", label: "Equipment & Maintenance" },
  { id: "lead", label: "Leadership Effectiveness" },
  { id: "comm", label: "Communication" },
  { id: "growth", label: "Growth & Development" },
];

const BASINS = ["Permian", "Bakken", "Eagle Ford", "Marcellus", "Haynesville", "DJ Basin"];

// Deterministic sample numbers per index (no live data).
function seed(str: string) {
  let x = 0;
  for (let i = 0; i < str.length; i++) x = (x * 31 + str.charCodeAt(i)) >>> 0;
  return x;
}
function barsFor(indexId: string) {
  const org = 62 + (seed(indexId) % 7);
  return BASINS.map((name) => {
    const value = 52 + (seed(indexId + name) % 23);
    return { id: name, name, value, org, delta: Math.round((value - org) * 10) / 10 };
  }).sort((a, b) => b.value - a.value);
}

const HEATMAP_STATEMENTS = [
  { id: "s1", text: "I have the equipment and resources I need to do my job safely." },
  { id: "s2", text: "Maintenance issues are addressed quickly when I report them." },
  { id: "s3", text: "My crew follows safety procedures consistently." },
  { id: "s4", text: "I feel comfortable raising safety concerns to leadership." },
  { id: "s5", text: "Preventive maintenance is prioritized over quick fixes." },
];
function heatValue(statementId: string, columnId: string) {
  return 50 + (seed(statementId + columnId) % 25);
}

// ─── Field redesign sample data ────────────────────────────────────────────
// Sample data mirroring the shape of the DWS Field redesign pilot
// (src/app/employee-experience/dws/), used only to illustrate the chrome and
// content patterns catalogued below. Deterministic, never live client data.

const FIELD_VIEWS = [
  {
    id: "basin",
    label: "Basin",
    reports: [
      { id: "basin-report", label: "Basin Report" },
      { id: "basin-breakdown", label: "Basin Breakdown" },
      { id: "basin-comparison", label: "Basin Comparison", dividerBefore: true },
    ],
  },
  {
    id: "department",
    label: "Department",
    reports: [
      { id: "dept-report", label: "Department Report" },
      { id: "dept-comparison", label: "Department Comparison" },
    ],
  },
];

const JOB_CATEGORIES = [
  { id: "roughneck", label: "Roughneck" },
  { id: "derrickman", label: "Derrickman" },
  { id: "floorhand", label: "Floorhand" },
  { id: "toolpusher", label: "Toolpusher" },
  { id: "driller", label: "Driller" },
];
function funnelValue(id: string) {
  return 55 + (seed(id) % 24);
}

const RESULT_INDEXES = [
  { id: "safety", name: "Safety & Wellbeing" },
  { id: "lead", name: "Leadership Effectiveness" },
];
const RESULT_STATEMENTS: Record<string, { id: string; text: string }[]> = {
  safety: [
    { id: "s1", text: "I have the equipment and resources I need to do my job safely." },
    { id: "s2", text: "Maintenance issues are addressed quickly when I report them." },
    { id: "s3", text: "My crew follows safety procedures consistently." },
  ],
  lead: [
    { id: "l1", text: "My supervisor treats me with respect." },
    { id: "l2", text: "I trust the decisions leadership makes for this crew." },
  ],
};
const CAMPAIGNS = [{ id: "prior", label: "Aug 2025" }, { id: "current", label: "May 2026" }];
function resultValue(statementId: string, campaignId: string) {
  const base = 52 + (seed(statementId) % 23);
  return campaignId === "prior" ? base - 2 - (seed(statementId + "p") % 4) : base;
}
function resultOrg(statementId: string) {
  return 58 + (seed(statementId + "org") % 10);
}

function Artifact({
  name,
  summary,
  importLine,
  children,
}: {
  name: string;
  summary: string;
  importLine: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 34 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#152238", margin: 0 }}>{name}</h2>
        <code style={{ fontSize: 12, color: "#3B4B63", background: "#EEF2F6", border: "1px solid #D4DAD6", borderRadius: 6, padding: "2px 8px" }}>{importLine}</code>
      </div>
      <p style={{ fontSize: 13.5, color: "#5A6B82", margin: "8px 0 16px", maxWidth: 760, lineHeight: 1.5 }}>{summary}</p>
      <div style={{ border: `1px solid ${KIT_BORDER}`, borderRadius: 16, background: "#fff", boxShadow: KIT_PANEL_SHADOW, padding: 22 }}>
        {children}
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, summary }: { eyebrow: string; title: string; summary: string }) {
  return (
    <div style={{ margin: "48px 0 26px", paddingTop: 30, borderTop: "1px solid #D4DAD6" }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", color: "#8798AA", textTransform: "uppercase" }}>{eyebrow}</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: "#152238", margin: "6px 0 8px", letterSpacing: "-0.02em" }}>{title}</h2>
      <p style={{ fontSize: 13.5, color: "#5A6B82", margin: 0, maxWidth: 760, lineHeight: 1.55 }}>{summary}</p>
    </div>
  );
}

// ─── Field redesign chrome demo pieces ─────────────────────────────────────
// Small, self-contained recreations of the DWS Field redesign pilot's chrome
// (src/app/employee-experience/dws/field-redesign-shell.tsx). These are NOT
// imported from the live pilot — they're built here purely to document the
// pattern, so they never affect (and never depend on) that file.

function FieldNavRailDemo() {
  const [expanded, setExpanded] = useState(true);
  const [openViewId, setOpenViewId] = useState("basin");
  const [activeReportId, setActiveReportId] = useState("basin-report");
  const width = expanded ? 240 : 44;

  return (
    <div
      style={{ width, flexShrink: 0, position: "relative", transition: "width .28s cubic-bezier(.4,0,.2,1)" }}
    >
      <div style={{ width: "100%", height: 420, background: "#E8ECE9", border: "1px solid #8798AA", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {expanded ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 11px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ borderRadius: 12, border: "1px solid #8798AA", background: "#fff", padding: 10, textAlign: "center" }}>
              <div style={{ width: 34, height: 34, margin: "0 auto", borderRadius: 9, background: "linear-gradient(135deg,#E8CC70,#C99A3C)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: "#242424" }}>DW</div>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#152238", marginTop: 8 }}>Deep Well Services</p>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#8798AA", marginTop: 2 }}>May 2026</p>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8798AA", padding: "0 2px" }}>Views</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {FIELD_VIEWS.map((view) => {
                const containsActive = view.reports.some((r) => r.id === activeReportId);
                const open = openViewId === view.id;
                return (
                  <div key={view.id} style={{ borderRadius: 11, border: containsActive ? "1px solid #D7B35A" : "1px solid #D9DFDA", borderLeft: containsActive ? "3px solid #D7B35A" : "1px solid #D9DFDA", background: "#fff", overflow: "hidden" }}>
                    <button
                      type="button"
                      onClick={() => setOpenViewId((prev) => (prev === view.id ? "" : view.id))}
                      style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 9px", width: "100%", border: "none", background: containsActive ? "#D7B35A" : "transparent", cursor: "pointer" }}
                    >
                      <span style={{ flex: 1, textAlign: "left", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: containsActive ? "#242424" : "#3B4B63" }}>{view.label}</span>
                      <ChevronDown style={{ width: 12, height: 12, color: containsActive ? "#242424" : "#8798AA", transform: open ? "rotate(180deg)" : undefined, transition: "transform .2s" }} />
                    </button>
                    {open ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "2px 7px 7px", borderTop: "1px solid #EEF1EE" }}>
                        {view.reports.map((report) => (
                          <div key={report.id}>
                            {report.dividerBefore ? <div style={{ height: 1, background: "#E4E9E5", margin: "5px 3px" }} /> : null}
                            <button
                              type="button"
                              onClick={() => setActiveReportId(report.id)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                padding: "7px 9px",
                                borderRadius: 8,
                                width: "100%",
                                textAlign: "left",
                                marginTop: 5,
                                cursor: "pointer",
                                background: report.id === activeReportId ? "#fff" : "transparent",
                                border: report.id === activeReportId ? "1px solid #8798AA" : "1px solid transparent",
                              }}
                            >
                              <span style={{ width: 4, height: 4, borderRadius: 99, background: report.id === activeReportId ? "#C99A3C" : "#C8D2CF", flexShrink: 0 }} />
                              <span style={{ fontSize: 11, fontWeight: report.id === activeReportId ? 700 : 600, color: report.id === activeReportId ? "#152238" : "#59675C" }}>{report.label}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: "#fff", border: "1px solid #C8D2CF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#242424" }}>DW</div>
            <div style={{ width: 18, height: 1, background: "#C8D2CF" }} />
            <button
              type="button"
              title="Views & reports"
              onClick={() => setExpanded(true)}
              style={{ width: 26, height: 26, borderRadius: 8, background: "#fff", border: "1px solid #C8D2CF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#59675C" }}
            >
              <PanelLeft style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{ position: "absolute", right: -13, top: "50%", transform: "translateY(-50%)", width: 26, height: 26, borderRadius: 99, background: "#fff", border: "1px solid #8798AA", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(15,23,42,.14)", color: "#3B4B63" }}
      >
        {expanded ? <ChevronLeft style={{ width: 14, height: 14 }} /> : <ChevronRight style={{ width: 14, height: 14 }} />}
      </button>
    </div>
  );
}

function ContextFiltersRailDemo() {
  const [expanded, setExpanded] = useState(true);
  const [tab, setTab] = useState<"context" | "filters">("context");
  const [basinId, setBasinId] = useState(BASINS[0]);
  const width = expanded ? 240 : 44;

  return (
    <div style={{ width, flexShrink: 0, position: "relative", transition: "width .28s cubic-bezier(.4,0,.2,1)" }}>
      <div style={{ width: "100%", height: 420, background: "#E8ECE9", border: "1px solid #8798AA", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {expanded ? (
          <>
            <div style={{ display: "flex", flexShrink: 0, background: "#DDE3DE", borderBottom: "1px solid #D4DAD6" }}>
              {(["context", "filters"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    border: "none",
                    borderBottom: tab === t ? "2px solid #2F9151" : "2px solid transparent",
                    background: tab === t ? "#fff" : "transparent",
                    color: tab === t ? "#152238" : "#6E7E96",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
              {tab === "context" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  <div style={{ borderRadius: 12, border: "1px solid #C8D2CF", background: "#fff", padding: "10px 11px", display: "flex", alignItems: "center", gap: 8 }}>
                    <Download style={{ width: 13, height: 13, color: "#3B4B63" }} />
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "#3B4B63" }}>Download report</span>
                  </div>
                  <div style={{ borderRadius: 12, border: "1px solid #C8D2CF", background: "#fff", padding: "11px 11px" }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8798AA" }}>Score Scale</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#6E7E96" }}>50</span>
                      <div style={{ flex: 1, height: 10, borderRadius: 99, border: "1px solid #C8D2CF", background: "linear-gradient(90deg,#D7B35A 0%,#FFFFFF 50%,#3F5F86 100%)" }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#6E7E96" }}>75</span>
                    </div>
                  </div>
                  <div style={{ borderRadius: 12, border: "1px solid #C8D2CF", background: "#fff", padding: "11px 11px" }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8798AA" }}>How to Read</span>
                    <p style={{ fontSize: 10.5, lineHeight: 1.5, color: "#3B4B63", margin: "7px 0 0" }}>Cells are favorability points. vs Org compares this basin to the company average.</p>
                  </div>
                </div>
              ) : (
                <div style={{ borderRadius: 12, border: "1px solid #C8D2CF", background: "#fff", padding: "12px 11px" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8798AA" }}>Basin</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
                    {BASINS.map((name) => {
                      const active = basinId === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setBasinId(name)}
                          style={{ padding: "5px 11px", borderRadius: 99, fontSize: 10.5, fontWeight: 600, cursor: "pointer", border: active ? "1px solid #D7B35A" : "1px solid #D4DAD6", background: active ? "#D7B35A" : "#F5F7F5", color: active ? "#242424" : "#3B4B63" }}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 8 }}>
            <button type="button" onClick={() => { setTab("context"); setExpanded(true); }} style={{ width: 26, height: 26, borderRadius: 8, background: "#fff", border: "1px solid #C8D2CF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#3B4B63" }}>
              <BarChart3 style={{ width: 13, height: 13 }} />
            </button>
            <div style={{ width: 18, height: 1, background: "#C8D2CF" }} />
            <button type="button" onClick={() => { setTab("filters"); setExpanded(true); }} style={{ width: 26, height: 26, borderRadius: 8, background: "#fff", border: "1px solid #C8D2CF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#3B4B63" }}>
              <SlidersHorizontal style={{ width: 13, height: 13 }} />
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{ position: "absolute", left: -13, top: "50%", transform: "translateY(-50%)", width: 26, height: 26, borderRadius: 99, background: "#fff", border: "1px solid #8798AA", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(15,23,42,.14)", color: "#3B4B63" }}
      >
        {expanded ? <ChevronRight style={{ width: 14, height: 14 }} /> : <ChevronLeft style={{ width: 14, height: 14 }} />}
      </button>
    </div>
  );
}

function ReportTitleHeaderDemo({ thick, kpis, suffix }: { thick?: boolean; kpis?: { label: string; value: string; color?: string }[]; suffix?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, paddingBottom: 16, borderBottom: thick ? "3px solid #1E3A5F" : "1px solid #EEF1EE" }}>
      <div>
        <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8798AA", marginBottom: 6 }}>Basin · May 2026</p>
        <h1 style={{ fontSize: 23, fontWeight: 800, color: "#152238", letterSpacing: "-0.02em", margin: 0 }}>
          Basin Report
          {suffix ? <><span style={{ color: "#8798AA", fontWeight: 700 }}> — </span><span style={{ color: "#3B4B63" }}>{suffix}</span></> : null}
        </h1>
      </div>
      {kpis ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {kpis.map((item) => (
            <div key={item.label} style={{ minWidth: 96, minHeight: 66, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 12px", borderRadius: 14, border: "1px solid #8798AA", background: "#F5F7F8" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6E7E96" }}>{item.label}</div>
              <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1, marginTop: 5, color: item.color ?? "#152238" }}>{item.value}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PointDifferenceChartDemo() {
  const rows = BASINS.map((name) => {
    const raw = (seed(name) % 90) / 10 - 4.5; // ranges roughly -4.5..+4.5
    return { name, delta: Math.round(raw * 10) / 10 };
  }).sort((a, b) => b.delta - a.delta);
  const axis = { min: -6, max: 6, ticks: [-6, -3, 0, 3, 6] };
  const span = axis.max - axis.min;
  const xp = (v: number) => `${((Math.max(axis.min, Math.min(axis.max, v)) - axis.min) / span) * 100}%`;
  const z0 = ((0 - axis.min) / span) * 100;
  return (
    <div>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: "40%", right: 0, top: 0, bottom: 0, pointerEvents: "none" }}>
          {axis.ticks.map((t) => <div key={t} style={{ position: "absolute", top: 0, bottom: 0, left: xp(t), borderLeft: t === 0 ? "2px solid #8798AA" : "1px dashed #D3DDE7" }} />)}
        </div>
        {rows.map((row) => {
          const positive = row.delta >= 0;
          const tone = positive ? { bg: "#DCEFE2", fg: "#2F6A45", border: "#9BC6A9" } : { bg: "#F4DEDD", fg: "#8A3D3A", border: "#D5A3A0" };
          const w = Math.abs((row.delta / span) * 100);
          const left = positive ? z0 : z0 - w;
          return (
            <div key={row.name} style={{ display: "grid", gridTemplateColumns: "minmax(120px,40%) minmax(0,1fr)", minHeight: 36, alignItems: "center", position: "relative" }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "#152238", paddingRight: 12 }}>{row.name}</div>
              <div style={{ position: "relative", height: 22 }}>
                <div style={{ position: "absolute", left: `${left}%`, width: `${w}%`, top: 0, bottom: 0, background: tone.bg, borderRadius: 3, outline: `1px solid ${tone.border}` }} />
                <div style={{ position: "absolute", top: "50%", left: `${positive ? left + w + 1.5 : left - 1.5}%`, transform: positive ? "translateY(-50%)" : "translate(-100%,-50%)", background: "#fff", color: tone.fg, border: `1px solid ${tone.border}`, fontSize: 11, fontWeight: 800, borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>
                  {(row.delta >= 0 ? "+" : "") + row.delta.toFixed(1)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(120px,40%) minmax(0,1fr)", marginTop: 6 }}>
        <div />
        <div style={{ position: "relative", height: 18 }}>
          {axis.ticks.map((t) => <div key={t} style={{ position: "absolute", left: xp(t), transform: "translateX(-50%)", fontSize: 11, color: "#152238" }}>{t}</div>)}
        </div>
      </div>
    </div>
  );
}

function ChipCellHeatmapDemo() {
  const dataColPx = 84;
  const headBand: React.CSSProperties = { background: "#E2E8EF", textAlign: "center", padding: "10px 6px", border: "1px solid #D3DDE7", color: "#6E7E96", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, tableLayout: "fixed" }}>
      <colgroup>
        <col />
        {BASINS.slice(0, 4).map((b) => <col key={b} style={{ width: dataColPx }} />)}
        <col style={{ width: dataColPx }} />
      </colgroup>
      <thead>
        <tr>
          <th style={{ ...headBand, textAlign: "left", padding: "10px 12px" }}>Safety Statement</th>
          {BASINS.slice(0, 4).map((b) => <th key={b} style={headBand}>{b}</th>)}
          <th style={{ ...headBand, borderLeft: "3px solid #8798AA", color: "#152238" }}>Avg</th>
        </tr>
      </thead>
      <tbody>
        {HEATMAP_STATEMENTS.slice(0, 3).map((statement) => {
          const rowVals = BASINS.slice(0, 4).map((b) => heatValue(statement.id, b));
          const avg = Math.round((rowVals.reduce((s, v) => s + v, 0) / rowVals.length) * 10) / 10;
          return (
            <tr key={statement.id}>
              <td style={{ border: "1px solid #D3DDE7", padding: "9px 12px", color: "#152238", lineHeight: 1.2, textAlign: "center" }}>{statement.text}</td>
              {BASINS.slice(0, 4).map((b) => {
                const value = heatValue(statement.id, b);
                const color = scoreColor(value);
                return (
                  <td key={b} style={{ border: "1px solid #D3DDE7", background: "#fff", padding: "6px 4px" }}>
                    <div style={{ width: "86%", margin: "0 auto", padding: "7px 0", borderRadius: 9, background: color, color: readableText(color), fontSize: 12.5, fontWeight: 800, textAlign: "center" }}>{value.toFixed(1)}</div>
                  </td>
                );
              })}
              <td style={{ border: "1px solid #D3DDE7", borderLeft: "3px solid #8798AA", background: "#fff", padding: "6px 4px" }}>
                <div style={{ width: "86%", margin: "0 auto", padding: "7px 0", borderRadius: 9, background: scoreColor(avg), color: readableText(scoreColor(avg)), fontSize: 12.5, fontWeight: 800, textAlign: "center" }}>{avg.toFixed(1)}</div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function StatementResultsTableDemo() {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const deltaTone = (d: number) => (d >= 2 ? { bg: "#C6DCC8", fg: "#2A3040" } : d >= 0.05 ? { bg: "#EAF3EB", fg: "#2A3040" } : d <= -2 ? { bg: "#D98B8B", fg: "#2A3040" } : d <= -0.05 ? { bg: "#F5E5E5", fg: "#2A3040" } : { bg: "#E8ECF0", fg: "#2A3040" });
  return (
    <div style={{ border: "1px solid #8798AA", borderRadius: 16, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ background: "#E2E8EF", textAlign: "left", padding: "11px 14px", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6E7E96", borderBottom: "1px solid #8798AA" }}>May 2026 vs Aug 2025 · expand an index for statements</th>
            {CAMPAIGNS.map((c) => <th key={c.id} style={{ background: "#E2E8EF", textAlign: "center", width: 84, padding: "11px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6E7E96", borderBottom: "1px solid #8798AA" }}>{c.label}</th>)}
            <th style={{ background: "#E2E8EF", textAlign: "center", width: 84, padding: "11px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6E7E96", borderBottom: "1px solid #8798AA", borderLeft: "3px solid #8798AA" }}>Delta</th>
            <th style={{ background: "#E2E8EF", textAlign: "center", width: 84, padding: "11px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6E7E96", borderBottom: "1px solid #8798AA", borderLeft: "1px solid #D3DDE7" }}>vs Org</th>
          </tr>
        </thead>
        <tbody>
          {RESULT_INDEXES.map((index) => {
            const isOpen = !collapsed[index.id];
            const statements = RESULT_STATEMENTS[index.id];
            const indexCur = Math.round((statements.reduce((s, st) => s + resultValue(st.id, "current"), 0) / statements.length) * 10) / 10;
            const indexPrev = Math.round((statements.reduce((s, st) => s + resultValue(st.id, "prior"), 0) / statements.length) * 10) / 10;
            const indexOrg = Math.round((statements.reduce((s, st) => s + resultOrg(st.id), 0) / statements.length) * 10) / 10;
            const change = Math.round((indexCur - indexPrev) * 10) / 10;
            const vsOrg = Math.round((indexCur - indexOrg) * 10) / 10;
            return (
              <Fragment key={index.id}>
                <tr onClick={() => setCollapsed((prev) => ({ ...prev, [index.id]: isOpen }))} style={{ cursor: "pointer", background: "#F1F4F7" }}>
                  <td style={{ padding: "9px 14px", borderTop: "1px solid #D3DDE7" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ChevronRight style={{ width: 13, height: 13, color: "#6E7E96", transform: isOpen ? "rotate(90deg)" : undefined, transition: "transform .2s", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#152238" }}>{index.name}</span>
                    </span>
                  </td>
                  {[["prior", indexPrev], ["current", indexCur]].map(([, value]) => {
                    const v = value as number;
                    const color = scoreColor(v);
                    return <td key={String(value)} style={{ textAlign: "center", padding: "6px 8px", borderTop: "1px solid #D3DDE7", background: color, color: readableText(color), fontWeight: 800, fontSize: 12.5 }}>{v.toFixed(1)}</td>;
                  })}
                  <td style={{ textAlign: "center", padding: "6px 8px", borderTop: "1px solid #D3DDE7", borderLeft: "3px solid #8798AA", background: deltaTone(change).bg, color: deltaTone(change).fg, fontWeight: 800, fontSize: 12.5 }}>{(change >= 0 ? "+" : "") + change.toFixed(1)}</td>
                  <td style={{ textAlign: "center", padding: "6px 8px", borderTop: "1px solid #D3DDE7", borderLeft: "1px solid #D3DDE7", background: deltaTone(vsOrg).bg, color: deltaTone(vsOrg).fg, fontWeight: 800, fontSize: 12.5 }}>{(vsOrg >= 0 ? "+" : "") + vsOrg.toFixed(1)}</td>
                </tr>
                {isOpen && statements.map((statement) => {
                  const cur = resultValue(statement.id, "current");
                  const prev = resultValue(statement.id, "prior");
                  const org = resultOrg(statement.id);
                  const sChange = Math.round((cur - prev) * 10) / 10;
                  const sVsOrg = Math.round((cur - org) * 10) / 10;
                  return (
                    <tr key={statement.id}>
                      <td style={{ padding: "7px 14px 7px 34px", borderTop: "1px solid #D3DDE7", color: "#3B4B63", fontSize: 12.5, lineHeight: 1.3 }}>{statement.text}</td>
                      {[prev, cur].map((value, i) => {
                        const color = scoreColor(value);
                        return <td key={i} style={{ textAlign: "center", padding: "6px 8px", borderTop: "1px solid #D3DDE7", background: color, color: readableText(color), fontWeight: 800, fontSize: 12.5 }}>{value.toFixed(1)}</td>;
                      })}
                      <td style={{ textAlign: "center", padding: "6px 8px", borderTop: "1px solid #D3DDE7", borderLeft: "3px solid #8798AA", background: deltaTone(sChange).bg, color: deltaTone(sChange).fg, fontWeight: 800, fontSize: 12.5 }}>{(sChange >= 0 ? "+" : "") + sChange.toFixed(1)}</td>
                      <td style={{ textAlign: "center", padding: "6px 8px", borderTop: "1px solid #D3DDE7", borderLeft: "1px solid #D3DDE7", background: deltaTone(sVsOrg).bg, color: deltaTone(sVsOrg).fg, fontWeight: 800, fontSize: 12.5 }}>{(sVsOrg >= 0 ? "+" : "") + sVsOrg.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function IndexScoreSummaryDemo() {
  const [open, setOpen] = useState<Record<string, boolean>>({ overall: true });
  const items = [
    { id: "overall", name: "Overall", score: 63.4, delta: 1.2, diff: -0.8, isOverall: true },
    ...INDEXES.map((index) => ({ id: index.id, name: index.label, score: 55 + (seed(index.id) % 20), delta: (seed(index.id + "d") % 40) / 10 - 2, diff: (seed(index.id + "o") % 30) / 10 - 1.5, isOverall: false })),
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      {items.map((item) => {
        const color = scoreColor(item.score);
        const isOpen = !!open[item.id];
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setOpen((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
            style={{ appearance: "none", fontFamily: "inherit", padding: 0, cursor: "pointer", width: item.isOverall ? 168 : 138, flexShrink: 0, display: "flex", flexDirection: "column", borderRadius: 14, overflow: "hidden", background: "#fff", border: "1.5px solid #8798AA", boxShadow: isOpen ? "0 8px 18px rgba(15,23,42,.14)" : "0 1px 3px rgba(15,23,42,.08)" }}
          >
            <div style={{ padding: item.isOverall ? "15px 12px 14px" : "12px 10px 11px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: item.isOverall ? 12 : 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#6E7E96", textAlign: "center", lineHeight: 1.15 }}>{item.name}</div>
              <div style={{ background: color, color: readableText(color), borderRadius: 10, padding: item.isOverall ? "5px 17px" : "4px 14px", fontSize: item.isOverall ? 27 : 19, fontWeight: 800 }}>{item.score.toFixed(1)}</div>
            </div>
            <div style={{ maxHeight: isOpen ? 50 : 0, overflow: "hidden", transition: "max-height .3s", background: "#fff", display: "flex", borderTop: isOpen ? "1px solid rgba(0,0,0,.06)" : "none" }}>
              <div style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRight: "1px solid #EEF1EE" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: item.delta >= 0 ? "#59885D" : "#D46A6A" }}>{(item.delta >= 0 ? "+" : "") + item.delta.toFixed(1)}</div>
                <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9AA6B2" }}>delta</div>
              </div>
              <div style={{ flex: 1, textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: item.diff >= 0 ? "#59885D" : "#D46A6A" }}>{(item.diff >= 0 ? "▲" : "▼") + Math.abs(item.diff).toFixed(1)}</div>
                <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9AA6B2" }}>diff</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SegmentFunnelDemo() {
  const [activeIndex, setActiveIndex] = useState(RESULT_INDEXES[0].id);
  const ranked = JOB_CATEGORIES.map((cat) => ({ ...cat, score: funnelValue(cat.id + activeIndex), n: 20 + (seed(cat.id) % 60) }))
    .sort((a, b) => b.score - a.score);
  const min = Math.min(...ranked.map((r) => r.score));
  const max = Math.max(...ranked.map((r) => r.score));
  return (
    <div style={{ display: "flex", gap: 0, alignItems: "stretch", minHeight: 260 }}>
      <IndexTabRail items={RESULT_INDEXES.map((i) => ({ id: i.id, label: i.name }))} activeId={activeIndex} onSelect={setActiveIndex} />
      <div style={{ flex: 1, minWidth: 0, border: `1px solid ${KIT_BORDER}`, borderRadius: 16, background: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", gap: 12, padding: "26px 24px" }}>
        {ranked.map((row) => {
          const t = max === min ? 1 : (row.score - min) / (max - min);
          const width = 46 + t * 52;
          const bg = scoreColor(row.score);
          return (
            <div key={row.id} style={{ width: `${width}%`, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 16px", borderRadius: 10, background: bg, color: readableText(bg), minHeight: 38, outline: "1px solid rgba(0,0,0,.18)", boxShadow: "0 2px 4px rgba(15,23,42,.14)" }}>
              <span style={{ display: "flex", alignItems: "baseline", gap: 7, minWidth: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{row.label}</span>
                <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.65 }}>n={row.n}</span>
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 800, flexShrink: 0 }}>{row.score.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GuidancePinCardDemo() {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ maxWidth: 340, borderRadius: 16, border: "1px solid #8798AA", background: "#fff", padding: "13px 14px" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} style={{ display: "flex", width: "100%", alignItems: "flex-start", gap: 11, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12.5, background: "#9CB2A8", color: "#fff" }}>!</span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "block", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#9CB2A8" }}>Watch Area</span>
          {open ? (
            <span style={{ display: "block", fontSize: 12, lineHeight: 1.4, color: "#152238", marginTop: 4, fontWeight: 600 }}>
              Permian crews report the sharpest equipment-maintenance decline of any basin this cycle — flag for the Q3 field-ops review.
            </span>
          ) : null}
        </span>
      </button>
    </div>
  );
}

function VerticalSectionLabelDemo() {
  return (
    <div style={{ position: "relative", marginLeft: 22, minHeight: 90 }}>
      <div style={{ position: "absolute", left: -44, top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#6E7E96", writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap", textDecoration: "underline" }}>
          Index Comparison
        </span>
      </div>
      <div style={{ border: `1px solid ${KIT_BORDER}`, borderRadius: 16, background: "#fff", minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center", color: "#6E7E96", fontSize: 13 }}>
        Section content sits here
      </div>
    </div>
  );
}

export default function PortalKitPage() {
  const [tabId, setTabId] = useState(INDEXES[0].id);
  const rows = barsFor(tabId);
  const activeIndexLabel = INDEXES.find((index) => index.id === tabId)?.label ?? "";

  return (
    <main style={{ minHeight: "100vh", background: "#F4F6F8", padding: "42px 32px 80px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <header style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", color: "#6E7E96", textTransform: "uppercase" }}>Caliber Consulting</div>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: "#152238", margin: "6px 0 10px", letterSpacing: "-0.02em" }}>Portal Kit</h1>
          <p style={{ fontSize: 15, color: "#3B4B63", margin: 0, maxWidth: 780, lineHeight: 1.55 }}>
            The named, reusable visual building blocks used across the client portal. Refer to any artifact by the name shown here and it will drop in with this exact formatting. This is a growing reference — new artifacts get added as we lock them in. Sample data only.
          </p>
        </header>

        <Artifact
          name="Tabbed Report Header"
          summary="The signature top visual: an IndexTabRail (single-select vertical tabs) floating to the left of a chart card that it visually feeds into, paired with a ScoreBarChart inside. Selecting a tab drives the chart. This is the standard field-report / comparison header pattern."
          importLine={`import { IndexTabRail, ScoreBarChart } from "@/components/portal-kit"`}
        >
          <div style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
            <IndexTabRail items={INDEXES} activeId={tabId} onSelect={setTabId} />
            <div style={{ flex: 1, minWidth: 0, border: `1px solid ${KIT_BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: KIT_PANEL_SHADOW }}>
              <div style={{ padding: "14px 22px", borderBottom: "1px solid #E2E8EF", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#152238", margin: 0 }}>Current Campaign · {activeIndexLabel}</h3>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6E7E96" }}>Comparison to Org</span>
              </div>
              <div style={{ padding: "20px 22px" }}>
                <ScoreBarChart rows={rows} axis={BAR_AXIS} scoreColor={scoreColor} />
              </div>
            </div>
          </div>
        </Artifact>

        <Artifact
          name="IndexTabRail"
          summary="A single-select vertical tab column that connects into the card on its right. The active tab is white and overlaps the card edge (its right border drops out); inactive tabs read as recessed. Inset from top/bottom so tabs clear the card's rounded corners. Place it as the first child of a stretch flex row with the card second."
          importLine={`import { IndexTabRail } from "@/components/portal-kit"`}
        >
          <div style={{ display: "flex", gap: 0, alignItems: "stretch", minHeight: 240 }}>
            <IndexTabRail items={INDEXES} activeId={tabId} onSelect={setTabId} />
            <div style={{ flex: 1, minWidth: 0, border: `1px solid ${KIT_BORDER}`, borderRadius: 16, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#6E7E96", fontSize: 14 }}>
              Card content — selected: <strong style={{ marginLeft: 6, color: "#152238" }}>{activeIndexLabel}</strong>
            </div>
          </div>
        </Artifact>

        <Artifact
          name="ScoreBarChart"
          summary="Horizontal score bars with a value chip, a benchmark/org marker (line + dot), and an optional delta pill in a fixed right column. Rows use uniform height and even vertical gaps so delta pills align on a steady rhythm; long labels clamp to two lines. Bars use the shared score gradient."
          importLine={`import { ScoreBarChart } from "@/components/portal-kit"`}
        >
          <ScoreBarChart rows={barsFor("equip")} axis={BAR_AXIS} scoreColor={scoreColor} />
        </Artifact>

        <Artifact
          name="StatementHeatmap"
          summary="Statement (row) × entity (column) heat map with a right Avg column and a bottom subtotal row. Cells use the shared score gradient; the frame follows the standard Caliber table system (strong outer border, muted uppercase headers, grid lines, bold centered scores)."
          importLine={`import { StatementHeatmap } from "@/components/portal-kit"`}
        >
          <StatementHeatmap
            statements={HEATMAP_STATEMENTS}
            columns={BASINS.map((name) => ({ id: name, name }))}
            getValue={heatValue}
            scoreColor={scoreColor}
            columnHeader="Equipment & Maintenance"
          />
        </Artifact>

        <Artifact
          name="Score gradient"
          summary="The canonical yellow → white → blue score gradient, mapped onto a [min, max] range via makeScoreColor. Keep this identical everywhere so colors read the same across every visual. Example below spans this dashboard's 50–75 scale."
          importLine={`import { makeScoreColor } from "@/components/portal-kit"`}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[50, 55, 60, 62.5, 65, 70, 75].map((value) => {
              const color = scoreColor(value);
              return (
                <div key={value} style={{ width: 84, textAlign: "center" }}>
                  <div style={{ height: 46, borderRadius: 10, border: "1px solid rgba(0,0,0,.12)", background: color }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#3B4B63", marginTop: 6 }}>{value}</div>
                </div>
              );
            })}
          </div>
        </Artifact>

        <SectionHeading
          eyebrow="DWS Field redesign pilot"
          title="Chrome & Navigation"
          summary="The shell around the report content — top nav, left report navigator, right Context/Filters rail, and the title header. Catalogued from src/app/employee-experience/dws/field-redesign-shell.tsx, the isolated pilot chrome for the DWS Field Employee Experience dashboard. None of this is promoted to a shared portal-kit component yet."
        />

        <Artifact
          name="FieldTopNavBar"
          summary="The dark-tone top nav (AppTopBanner with tone=“dark”): gold #D7B35A active pill, green #386B45 hover, and a two-part divider under the bar — a thin white gap for breathing room, then a bar matching the nav's own dark background — instead of one flat hairline."
          importLine={`import { AppTopBanner } from "@/components/shared/app-top-banner"`}
        >
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${KIT_BORDER}` }}>
            <div style={{ background: "#242424", padding: "13px 20px", display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>Caliber</div>
              <div style={{ width: 1, height: 20, background: "rgba(255,255,255,.16)" }} />
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,.68)", margin: 0 }}>Employee Experience</p>
              <nav style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                <span style={{ padding: "7px 13px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, border: "1px solid #D7B35A", background: "#D7B35A", color: "#242424" }}>Basin Report</span>
                <span style={{ padding: "7px 13px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, border: "1px solid transparent", color: "rgba(255,255,255,.84)" }}>Basin Breakdown</span>
                <span style={{ padding: "7px 13px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, border: "1px solid transparent", color: "rgba(255,255,255,.84)" }}>Basin Comparison</span>
              </nav>
            </div>
            <div style={{ height: 1.5, background: "#fff" }} />
            <div style={{ height: 4, background: "#242424" }} />
            <div style={{ padding: "16px 20px", background: "#F4F6F8", fontSize: 12, color: "#8798AA" }}>Page content begins here.</div>
          </div>
        </Artifact>

        <Artifact
          name="ReportNavigatorRail"
          summary="The left-rail Views → Reports accordion. Each View is its own bordered card; the containing View auto-highlights gold when it holds the active report. A thin dividerBefore line groups sibling reports within a View that read as fundamentally different lenses (e.g. Basin Report + Basin Breakdown — a deep dive into one unit — set apart from Basin Comparison — a lens across units). Click-only toggling — the edge chevron or the icon-rail button expands/collapses the 44px icon rail; it no longer auto-toggles on hover. The client identity block (logo, client name, dashboard name, campaign) sits above the accordion. Try clicking the chevron on the rail below."
          importLine={`// lives in field-redesign-shell.tsx — not yet promoted to shared portal-kit`}
        >
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
            <FieldNavRailDemo />
          </div>
        </Artifact>

        <Artifact
          name="ContextFiltersRail"
          summary="The right-rail Context / Filters tab switcher. Context holds the page-level export card, the Score Scale + Delta legend, and a How to Read note; Filters holds the report's own scoping controls (e.g. the Basin picker). Same click-only collapse-to-44px behavior as the left rail — the edge chevron or an icon-rail button toggles it, with no auto-expand on hover. Both tabs stay mounted at all times so state (e.g. a report's own portaled filter selectors) survives switching tabs."
          importLine={`// lives in field-redesign-shell.tsx — not yet promoted to shared portal-kit`}
        >
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
            <ContextFiltersRailDemo />
          </div>
        </Artifact>

        <Artifact
          name="ReportTitleHeader"
          summary="The single title bar that replaced each report's old internal hero: eyebrow + report title, an optional header-extra slot on the right (KPI chips, or — on Basin Breakdown — the Breakdown view-switcher), an optional title suffix appended after the title (e.g. “Basin Report — East Texas”), and an optional thicker divider used when a report has consolidated a second header into this one. Top example is the plain header; bottom is Basin Report's consolidated variant with KPI chips, a title suffix, and the thicker divider."
          importLine={`// lives in field-redesign-shell.tsx — not yet promoted to shared portal-kit`}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <ReportTitleHeaderDemo />
            <ReportTitleHeaderDemo thick suffix="East Texas" kpis={[{ label: "Responses", value: "142" }, { label: "Response Rate", value: "68%" }]} />
          </div>
        </Artifact>

        <SectionHeading
          eyebrow="DWS Field redesign pilot"
          title="Main Content"
          summary="The report-body visual patterns from Basin Report, Basin Breakdown, and Basin Comparison — src/app/employee-experience/dws/ee-department-report.tsx, ee-segment-breakdown.tsx, and ee-location-comparison.tsx, plus their shared building blocks in ee-report-kit.tsx and ee-comparison-heatmap.tsx. Two pairs below look similar but are semantically different — read the callouts on StatementResultsTable and ViewSwitcherPills."
        />

        <Artifact
          name="TabbedBarChart — with comparison line"
          summary="An attached index rail + horizontal bar chart, where every bar also carries a benchmark/org marker (line + dot) showing how that row compares to a per-row reference point. This is Basin Report's “Index Comparison” chart. Currently implemented as a near-duplicate of IndexTabRail + ScoreBarChart (ee-report-kit.tsx's IndexRailTabs + BrandComparisonChart) rather than reusing these shared components — see the inconsistency callout in the summary response."
          importLine={`// lives in ee-report-kit.tsx (IndexRailTabs + BrandComparisonChart) — not yet promoted to shared portal-kit`}
        >
          <div style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
            <IndexTabRail items={INDEXES} activeId={tabId} onSelect={setTabId} />
            <div style={{ flex: 1, minWidth: 0, border: `1px solid ${KIT_BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: KIT_PANEL_SHADOW }}>
              <div style={{ padding: "14px 22px", borderBottom: "1px solid #E2E8EF" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#152238", margin: 0 }}>{activeIndexLabel} Statements</h3>
              </div>
              <div style={{ padding: "20px 22px" }}>
                <ScoreBarChart rows={rows} axis={BAR_AXIS} scoreColor={scoreColor} />
              </div>
            </div>
          </div>
        </Artifact>

        <Artifact
          name="TabbedBarChart — without comparison line"
          summary="Same attached-rail bar chart, but rows carry no per-row benchmark marker — used when every row would compare to the same single reference point (e.g. Basin Comparison's “Current Campaign” chart, where every basin compares to one overall average). Drawing a line at the identical position on every row would be redundant, so it's dropped; the delta pill alone still carries the comparison."
          importLine={`// lives in ee-report-kit.tsx (IndexRailTabs + BrandComparisonChart, showOrgLine=false) — not yet promoted to shared portal-kit`}
        >
          <div style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
            <IndexTabRail items={INDEXES} activeId={tabId} onSelect={setTabId} />
            <div style={{ flex: 1, minWidth: 0, border: `1px solid ${KIT_BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: KIT_PANEL_SHADOW }}>
              <div style={{ padding: "14px 22px", borderBottom: "1px solid #E2E8EF" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#152238", margin: 0 }}>Current Campaign · {activeIndexLabel}</h3>
              </div>
              <div style={{ padding: "20px 22px" }}>
                <ScoreBarChart rows={rows.map(({ org, ...rest }) => rest)} axis={BAR_AXIS} scoreColor={scoreColor} />
              </div>
            </div>
          </div>
        </Artifact>

        <Artifact
          name="PointDifferenceChart"
          summary="A standalone diverging bar chart — no attached rail. Bars grow left (decline, red) or right (gain, green) from a zero baseline instead of from a shared axis minimum, so it reads as pure movement rather than an absolute score. This is Basin Comparison's “Point Difference” chart; it never carries a score-gradient fill or a benchmark line, which is what separates it from every TabbedBarChart / ScoreBarChart variant above."
          importLine={`// lives in ee-location-comparison.tsx (DeptDeltaChart) — not yet promoted to shared portal-kit`}
        >
          <PointDifferenceChartDemo />
        </Artifact>

        <Artifact
          name="StatementResultsTable"
          summary={`Statement (row) × campaign-time (column) list — NOT the same pattern as StatementHeatmap above. Rows are individual statements, grouped under collapsible index headers; columns are campaign dates plus Delta (vs prior campaign) and vs Org, each colored on the score/delta scale. This is Basin Report's "Statement Results" section. Read it as "one unit's statements over time," where StatementHeatmap reads as "one statement across many entities right now."`}
          importLine={`// lives in ee-department-report.tsx — not yet promoted to shared portal-kit`}
        >
          <StatementResultsTableDemo />
        </Artifact>

        <Artifact
          name="StatementHeatmap — chip-cell variant"
          summary="The same statement × entity heat-map concept as the canonical StatementHeatmap above, but implemented separately for the field redesign with a different cell treatment: cells stay plain white, and a rounded score chip sized to ~86% of the column width carries the color, instead of the cell itself being filled edge-to-edge. Visually distinct from the portal-kit's StatementHeatmap — flagged as an inconsistency worth resolving before this pattern replicates further (see summary)."
          importLine={`// lives in ee-comparison-heatmap.tsx (ComparisonHeatmap) and ee-segment-breakdown.tsx (SegmentHeatmap) — not yet promoted to shared portal-kit`}
        >
          <ChipCellHeatmapDemo />
        </Artifact>

        <Artifact
          name="IndexScoreSummary"
          summary="The expandable score-tile strip at the top of Basin Report: an Overall tile (larger, anchored left) plus one tile per index. Each tile shows its score as a colored chip; clicking a tile expands it to reveal Delta (vs prior campaign) and Diff (vs org) underneath. Read as the headline scorecard that the Index Comparison chart and Statement Results table below it then break down further."
          importLine={`// lives in index-score-summary.tsx (IndexScoreSummary) — not yet promoted to shared portal-kit`}
        >
          <IndexScoreSummaryDemo />
        </Artifact>

        <Artifact
          name="SegmentFunnel"
          summary="A ranked stack of centered, variable-width pill bars — widest (and highest-scoring) at top — paired with an attached index rail on the left. This is Basin Breakdown's ranked comparison of segment values (e.g. job categories) for the selected index. Distinct from ScoreBarChart: bars are centered and scaled by relative rank rather than left-aligned against a shared numeric axis, so it reads as a ranking first and an absolute scale second."
          importLine={`// lives in ee-segment-breakdown.tsx (SegmentFunnel) — not yet promoted to shared portal-kit`}
        >
          <SegmentFunnelDemo />
        </Artifact>

        <Artifact
          name="FilterPillGroup"
          summary="A genuine filter: a collapsible card (EmbeddedFilterCard) holding a row of selectable pills (PillOptionRow) that scope every visual on the page to one selection — e.g. Basin Breakdown's Basin picker. Gold #D7B35A when selected, green #386B45 on hover, matching the top nav's interaction colors. Lives in the right rail's Filters tab."
          importLine={`// lives in ee-report-kit.tsx (EmbeddedFilterCard + PillOptionRow) — not yet promoted to shared portal-kit`}
        >
          <div style={{ maxWidth: 320, borderRadius: 13, border: "1px solid #C8D2CF", background: "#fff", padding: "14px 13px" }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8798AA" }}>Basin</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
              {BASINS.slice(0, 4).map((name, i) => (
                <span key={name} style={{ padding: "5px 11px", borderRadius: 99, fontSize: 11.5, fontWeight: 600, border: i === 0 ? "1px solid #D7B35A" : "1px solid #D4DAD6", background: i === 0 ? "#D7B35A" : "#F5F7F5", color: i === 0 ? "#242424" : "#3B4B63" }}>{name}</span>
              ))}
            </div>
          </div>
        </Artifact>

        <Artifact
          name="ViewSwitcherPills"
          summary={`Visually the same pill row as FilterPillGroup above, but semantically different — this does NOT scope or filter data. It swaps in an entirely different report view (e.g. Basin Breakdown's "Breakdown" switcher toggling between Job Category / Department / Role / Tenure). Because it changes WHICH report renders rather than filtering the current one, it lives centered above the report content in its own subtle container, not inside the Filters tab. This distinction caused real user confusion — call it "ViewSwitcherPills" specifically to keep it separate from "FilterPillGroup" in conversation.`}
          importLine={`// lives in ee-segment-breakdown.tsx (the "Breakdown" dimension switcher) — not yet promoted to shared portal-kit`}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 14, border: "1px solid #D4DAD6", background: "#F4F6F4" }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8798AA", padding: "0 2px" }}>Breakdown</span>
              {["Job Category", "Department", "Role", "Tenure"].map((label, i) => (
                <span key={label} style={{ padding: "5px 12px", borderRadius: 99, fontSize: 11.5, fontWeight: 600, border: i === 0 ? "1px solid #D7B35A" : "1px solid #D4DAD6", background: i === 0 ? "#D7B35A" : "#F5F7F5", color: i === 0 ? "#242424" : "#3B4B63" }}>{label}</span>
              ))}
            </div>
          </div>
        </Artifact>

        <Artifact
          name="Score Legend / How to Read"
          summary="The right-rail context cards used everywhere in the field redesign: a Legend card (score gradient + delta gradient, each with min/max labels) and a How to Read card with a short plain-language explanation. Static and non-editable — contrast with GuidancePinCard below, which is admin-authored and expandable."
          importLine={`// lives in ee-context-rail.tsx (EEContextRail) — not yet promoted to shared portal-kit`}
        >
          <div style={{ maxWidth: 320, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ borderRadius: 16, border: `1px solid ${KIT_BORDER}`, background: "#fff", padding: "13px 14px" }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#6E7E96" }}>Score Scale</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#6E7E96" }}>50</span>
                <div style={{ flex: 1, height: 14, borderRadius: 99, border: `1px solid ${KIT_BORDER}`, background: "linear-gradient(90deg,#D7B35A 0%,#FFFFFF 50%,#3F5F86 100%)" }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#6E7E96" }}>75</span>
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #EEF1EE" }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#6E7E96" }}>Delta / Diff Scale</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#6E7E96" }}>Decline</span>
                  <div style={{ flex: 1, height: 14, borderRadius: 99, border: `1px solid ${KIT_BORDER}`, background: "linear-gradient(90deg,#D46A6A 0%,#F5EFEF 50%,#59885D 100%)" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#6E7E96" }}>Gain</span>
                </div>
              </div>
            </div>
            <div style={{ borderRadius: 16, border: `1px solid ${KIT_BORDER}`, background: "#fff", padding: "13px 14px" }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#6E7E96" }}>How to Read</span>
              <p style={{ fontSize: 12, lineHeight: 1.5, color: "#3B4B63", margin: "8px 0 0" }}>Cells are favorability points. vs Org compares this basin to the company average.</p>
            </div>
          </div>
        </Artifact>

        <Artifact
          name="GuidancePinCard"
          summary="An admin-authored, expandable recommendation card in the right rail — a colored pip, an editorial label (e.g. “Watch Area”), and expanded guidance text on click. Unlike Score Legend / How to Read (static, always the same copy), these are written per campaign/filter selection and editable by admins. Currently used on Basin Comparison."
          importLine={`// lives in guidance-pin-rail.tsx (GuidancePinRail) — not yet promoted to shared portal-kit`}
        >
          <GuidancePinCardDemo />
        </Artifact>

        <Artifact
          name="VerticalSectionLabel"
          summary="An experimental section-title treatment used only on Basin Report: instead of a horizontal label above a section, the label runs vertically in a narrow rail to its left, vertically centered against the section's own height. Same size/weight/tracking/color as the standard .slabel section title — just rotated."
          importLine={`// lives in ee-department-report.tsx (VerticalSectionLabel / SectionWithVerticalLabel) — not yet promoted to shared portal-kit`}
        >
          <VerticalSectionLabelDemo />
        </Artifact>
      </div>
    </main>
  );
}
