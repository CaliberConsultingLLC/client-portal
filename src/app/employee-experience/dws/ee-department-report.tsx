// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { toDepartmentReportData } from "./ee-demo-fixture";
import {
  ClientMark,
  DateHead,
  EEReportStyles,
  RailSection,
  Chevron,
  f1,
  isLightBand,
  dwsScoreColor,
  dwsDeltaStyle,
  mean,
  round1,
} from "./ee-report-kit";
import { EEContextRail } from "./ee-context-rail";

const REPORT_DATA = toDepartmentReportData();
const ALL = "all";
const PREFERRED_CURRENT_CAMPAIGN = "May 2026";
const PREFERRED_PRIOR_CAMPAIGN = "Aug 2025";

function valueFor(cell, campaign) {
  if (!cell) return null;
  const value = campaign.isCurrent ? cell.current : cell.comparisons[campaign.id];
  return typeof value === "number" && value > 0 ? value : null;
}

function textFor(color) {
  return isLightBand(color) ? "#1C252A" : "#fff";
}

function campaignMatches(campaign, label) {
  const source = String(campaign?.labelLong || campaign?.label || "").toLowerCase();
  return source === label.toLowerCase();
}

function splitSupervisorName(value) {
  const raw = String(value || "").trim();
  if (!raw) return { top: "", bottom: "" };
  if (raw.includes(",")) {
    const [last, first] = raw.split(",").map((part) => part.trim());
    return { top: last, bottom: first || "" };
  }
  const parts = raw.split(/\s+/);
  if (parts.length <= 1) return { top: raw, bottom: "" };
  return { top: parts.at(-1), bottom: parts.slice(0, -1).join(" ") };
}

function SegmentCard({ segment, deptId, minN, companyAvg, scoreColor, lockButton }) {
  const rows = segment.groups
    .map((group) => {
      const cell = group.byDept[deptId];
      return cell && cell.responses >= minN ? { ...group, ...cell } : null;
    })
    .filter(Boolean)
    .sort((left, right) => right.current - left.current);

  if (rows.length === 0) return null;

  return (
    <div className="card relative">
      <div className="card-head"><h3 className="card-title">{segment.label}</h3></div>
      <div className="card-body">
        <div className="seg-rows">
          {rows.map((row) => {
            const color = scoreColor(row.current);
            return (
              <div className="seg-row" key={row.id}>
                <div className="seg-name" title={row.name}>{row.name}<span className="seg-n">n={row.responses}</span></div>
                <div className="seg-track">
                  <div className="seg-bar" style={{ width: `${row.current}%`, background: color }} />
                  <div className="seg-coline" style={{ left: `${companyAvg}%` }} />
                  <div className="seg-val" style={{ color: textFor(color) }}>{row.current.toFixed(1)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {lockButton}
    </div>
  );
}

function BrandComparisonChart({ rows, axis, scoreColor }) {
  const pct = (value) => ((Math.max(axis.min, Math.min(axis.max, value)) - axis.min) / (axis.max - axis.min)) * 100;
  return (
    <div className="chart" style={{ "--label-col": "280px", "--gap-col": "140px" }}>
      <style>{`
        .br-track{height:24px;background:#F1F4F7;border-radius:0 7px 7px 0;position:relative}
        .br-bar{position:absolute;left:0;top:0;bottom:0;border-radius:0 7px 7px 0}
        .br-chip{position:absolute;left:8px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.95);color:#152238;border:1px solid rgba(21,34,56,.16);font-size:12px;font-weight:800;padding:3px 8px;border-radius:6px}
        .br-org{position:absolute;top:2px;bottom:2px;width:0;border-left:2.5px solid rgba(21,34,56,.55);z-index:5}
        .br-org-dot{position:absolute;top:50%;width:16px;height:16px;border-radius:999px;background:#152238;border:2px solid #fff;transform:translate(-50%,-50%);box-shadow:0 1px 3px rgba(0,0,0,.32);z-index:6}
        .br-row{display:grid;grid-template-columns:minmax(0,min(var(--label-col),50%)) minmax(0,1fr) var(--gap-col);align-items:center;column-gap:16px;min-height:34px;padding:2px 0}
        .br-axis-row{display:grid;grid-template-columns:minmax(0,min(var(--label-col),50%)) minmax(0,1fr) var(--gap-col);align-items:center;column-gap:16px;padding:0}
        .br-gap-col{display:flex;align-items:center;justify-content:center;padding-left:10px}
        .br-gap-pill{min-width:96px;padding:4px 10px;border-radius:999px;text-align:center;font-size:13px;font-weight:900;border:1px solid}
      `}</style>
      <div className="plot">
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
                <div className="br-org" style={{ left: `${pct(row.org)}%` }} />
                <div className="br-org-dot" style={{ left: `${pct(row.org)}%` }} />
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

export function EEDepartmentReport({
  data,
  unitLabel = "Department",
  reportHeading = "DEPARTMENT REPORT",
  stylePreset = "default",
  enableVisualLocks = true,
}: {
  data: any;
  unitLabel?: string;
  reportHeading?: string;
  stylePreset?: "default" | "division";
  enableVisualLocks?: boolean;
}) {
  const { client, current, comparisons, scale, departments = [], indexes = [], segments } = data;

  const scoreColor = dwsScoreColor;
  const activeDeltaStyle = dwsDeltaStyle;
  const [deptId, setDeptId] = useState(departments[0]?.id ?? "");
  const [focus, setFocus] = useState(() => (unitLabel === "Brand" ? indexes[0]?.id ?? ALL : ALL));
  const [currentCampaignId, setCurrentCampaignId] = useState(() => {
    const preferredCurrent = [current, ...comparisons].find((campaign) => campaignMatches(campaign, PREFERRED_CURRENT_CAMPAIGN));
    return preferredCurrent?.id ?? current.id;
  });
  const [priorCampaignId, setPriorCampaignId] = useState(() => {
    const preferredPrior = comparisons.find((campaign) => campaignMatches(campaign, PREFERRED_PRIOR_CAMPAIGN));
    return preferredPrior?.id ?? comparisons[comparisons.length - 1]?.id ?? "";
  });
  const [visualLocks, setVisualLocks] = useState<Record<string, {
    enabled: boolean;
    deptId: string;
    focus: string;
    priorCampaignId: string;
    campaignId: string;
  }>>({});
  const timeline = useMemo(
    () => [...comparisons.map((item) => ({ ...item, isCurrent: false })), { ...current, isCurrent: true }],
    [comparisons, current]
  );
  const timelineRecentFirst = useMemo(() => [...timeline].reverse(), [timeline]);

  useEffect(() => {
    if (!departments.find((item) => item.id === deptId)) {
      setDeptId(departments[0]?.id ?? "");
    }
  }, [departments, deptId]);

  const CANVAS_STYLE = { display: "block", minHeight: "calc(100vh - var(--app-top-banner-height, 78px) - 66px)", background: "linear-gradient(90deg, #E8ECE9 0 268px, #fff 268px calc(100% - 268px), #E8ECE9 calc(100% - 268px) 100%)", overflowAnchor: "none" } as const;
  const LEFT_RAIL_STYLE = { position: "fixed" as const, top: "calc(var(--app-top-banner-height, 78px) + 66px)", bottom: 0, left: 0, width: 268, overflow: "auto", overflowAnchor: "none", background: "#E8ECE9", padding: "26px 22px", zIndex: 30, borderRight: "1px solid #D4DAD6" };
  const RIGHT_RAIL_STYLE = { position: "fixed" as const, top: "calc(var(--app-top-banner-height, 78px) + 66px)", right: 0, bottom: 0, width: 268, overflow: "auto", overflowAnchor: "none", background: "#E8ECE9", borderLeft: "1px solid #D4DAD6", padding: "26px 22px" };
  const CENTER_STYLE = { minHeight: "calc(100vh - var(--app-top-banner-height, 78px) - 66px)", marginLeft: 268, marginRight: 268, background: "#fff", overflowAnchor: "none", padding: "30px 30px 56px" } as const;

  if (!departments.length || !indexes.length) {
    return (
      <div className="canvas" style={CANVAS_STYLE}>
        <EEReportStyles />
        <aside style={LEFT_RAIL_STYLE} />
        <aside style={RIGHT_RAIL_STYLE} />
        <main style={CENTER_STYLE}>
          <div style={{ maxWidth: 1320, margin: "0 auto" }}>
            <p style={{ color: "#6E7E96", fontSize: 14 }}>No department report data is available for this campaign yet.</p>
          </div>
        </main>
      </div>
    );
  }

  const dept = departments.find((item) => item.id === deptId) ?? departments[0];
  const curCamp = timeline.find((item) => item.id === currentCampaignId) ?? current;
  const previous = timeline.find((item) => item.id === priorCampaignId) ?? comparisons[comparisons.length - 1] ?? null;
  const campaigns = previous ? [previous, curCamp] : [curCamp];
  const minN = data.segmentMinResponses ?? 5;
  const defaultVisualContext = {
    enabled: false,
    deptId,
    focus,
    priorCampaignId: previous?.id ?? "",
    campaignId: curCamp.id,
  };
  const resolveVisualContext = (visualId) => {
    if (!enableVisualLocks) return defaultVisualContext;
    const lock = visualLocks[visualId];
    return lock?.enabled ? lock : defaultVisualContext;
  };
  const toggleVisualLock = (visualId) => {
    setVisualLocks((prev) => {
      const existing = prev[visualId];
      if (existing?.enabled) {
        return { ...prev, [visualId]: { ...existing, enabled: false } };
      }
      return {
        ...prev,
        [visualId]: {
          enabled: true,
          deptId,
          focus,
          priorCampaignId: previous?.id ?? "",
          campaignId: curCamp.id,
        },
      };
    });
  };
  const buildLockButton = (visualId, label) => {
    if (unitLabel !== "Brand" || !enableVisualLocks) return null;
    const locked = Boolean(visualLocks[visualId]?.enabled);
    return (
      <button
        type="button"
        onClick={() => toggleVisualLock(visualId)}
        title={locked ? `${label} locked` : `${label} unlocked`}
        aria-label={locked ? `Unlock ${label}` : `Lock ${label}`}
        className="absolute bottom-3 right-3 z-[2] inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#8798AA] bg-white/90 text-[#3B4B63] shadow-[0_4px_10px_rgba(15,23,42,.12)]"
      >
        {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
      </button>
    );
  };

  const chartContext = resolveVisualContext("brand-chart");
  const tableContext = resolveVisualContext("statement-table");
  const chartDeptId = chartContext.deptId || deptId;
  const chartFocus = chartContext.focus || focus;
  const chartCampaign = timeline.find((item) => item.id === chartContext.campaignId) ?? curCamp;
  const tableDeptId = tableContext.deptId || deptId;
  const tableFocus = tableContext.focus || focus;
  const tableCampaign = timeline.find((item) => item.id === tableContext.campaignId) ?? curCamp;
  const tablePrevious =
    timeline.find((item) => item.id === tableContext.priorCampaignId) ??
    (tableContext.priorCampaignId ? comparisons.find((item) => item.id === tableContext.priorCampaignId) : null) ??
    null;
  const tableCampaigns = tablePrevious ? [tablePrevious, tableCampaign] : [tableCampaign];

  const deptIndex = (index, campaign) => {
    const values = index.statements
      .map((statement) => valueFor(statement.byDept[deptId], campaign))
      .filter((value): value is number => value != null);
    return values.length > 0 ? round1(mean(values)) : null;
  };
  const deptTotal = (campaign) => {
    const values = indexes
      .flatMap((index) => index.statements.map((statement) => valueFor(statement.byDept[deptId], campaign)))
      .filter((value): value is number => value != null);
    return values.length > 0 ? round1(mean(values)) : null;
  };
  const companyStatement = (statement, campaign) => {
    let num = 0;
    let den = 0;
    departments.forEach((item) => {
      const value = valueFor(statement.byDept[item.id], campaign);
      if (value == null) return;
      num += value * item.responses;
      den += item.responses;
    });
    return den > 0 ? round1(num / den) : null;
  };
  const companyIndex = (index, campaign) => {
    const values = index.statements
      .map((statement) => companyStatement(statement, campaign))
      .filter((value): value is number => value != null);
    return values.length > 0 ? round1(mean(values)) : null;
  };
  const companyOverall = (campaign) => {
    const values = indexes
      .flatMap((index) => index.statements.map((statement) => companyStatement(statement, campaign)))
      .filter((value): value is number => value != null);
    return values.length > 0 ? round1(mean(values)) : null;
  };
  const showVsOrg = unitLabel !== "Brand";
  const activeIndex = indexes.find((index) => index.id === chartFocus) ?? indexes[0] ?? null;
  const brandChartRows = activeIndex
    ? activeIndex.statements
        .map((statement) => {
          const value = valueFor(statement.byDept[chartDeptId], chartCampaign);
          const org = companyStatement(statement, chartCampaign);
          if (value == null || org == null) return null;
          return {
            id: statement.id,
            name: statement.text,
            value,
            delta: round1(value - org),
            org,
          };
        })
        .filter((row): row is { id: string; name: string; value: number; delta: number; org: number } => row != null)
        .sort((left, right) => right.value - left.value)
    : [];
  const allBrandValues = [...brandChartRows.map((row) => row.value), ...brandChartRows.map((row) => row.org)];
  const brandChartAxisMin = Math.floor((Math.min(...allBrandValues) - 2) / 5) * 5;
  const brandChartAxisMax = Math.ceil((Math.max(...allBrandValues) + 2) / 5) * 5;
  const brandChartAxisTicks = [];
  for (let tick = brandChartAxisMin; tick <= brandChartAxisMax; tick += 5) brandChartAxisTicks.push(tick);
  const brandChartAxis = {
    min: Number.isFinite(brandChartAxisMin) ? brandChartAxisMin : 0,
    max: Number.isFinite(brandChartAxisMax) ? brandChartAxisMax : 100,
    ticks: brandChartAxisTicks.length > 0 ? brandChartAxisTicks : [0, 20, 40, 60, 80, 100],
  };

  const total = deptTotal(curCamp);
  const previousTotal = previous ? deptTotal(previous) : null;
  const totalDelta = total == null || previousTotal == null ? null : round1(total - previousTotal);
  const enpsForCampaign = (campaign) => {
    const cell = data.enpsByDept?.[deptId];
    if (!cell || !campaign) return null;
    return campaign.isCurrent ? cell.current ?? null : cell.comparisons?.[campaign.id] ?? null;
  };
  const brandEnpsCurrent = unitLabel === "Brand" ? enpsForCampaign(curCamp) : null;
  const brandEnpsPrevious =
    unitLabel === "Brand" && previous ? enpsForCampaign(previous) : null;
  const brandEnpsDelta =
    brandEnpsCurrent == null || brandEnpsPrevious == null ? null : round1(brandEnpsCurrent - brandEnpsPrevious);
  const supervisorHeatmapForDept = unitLabel === "Brand" ? data.supervisorHeatmap?.byDept?.[deptId] : null;
  return (
    <div className="canvas" style={CANVAS_STYLE}>
      <EEReportStyles />
      <aside style={LEFT_RAIL_STYLE}>
        <div className="client-card"><ClientMark client={client} /><div className="client-head">{reportHeading}</div></div>
        <RailSection title={unitLabel} defaultOpen>
          <select className="rail-select" value={deptId} onChange={(event) => setDeptId(event.target.value)}>
            {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <p className="rs-hint">{dept.location ? `${dept.location} · ` : ""}{dept.responses} responses</p>
        </RailSection>
        <RailSection title="Campaign Selection">
          <div className="flex flex-col gap-3">
            <div>
              <span className="block text-center text-xs font-medium text-[#6E7E96]">Current</span>
              <select className="rail-select" value={curCamp.id} onChange={(event) => setCurrentCampaignId(event.target.value)}>
                {timelineRecentFirst.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.labelLong || campaign.label}</option>)}
              </select>
            </div>
            <div>
              <span className="block text-center text-xs font-medium text-[#6E7E96]">Compared To</span>
              <select className="rail-select" value={previous?.id ?? ""} onChange={(event) => setPriorCampaignId(event.target.value)}>
                {timelineRecentFirst.filter((campaign) => campaign.id !== curCamp.id).map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.labelLong || campaign.label}</option>)}
              </select>
            </div>
          </div>
        </RailSection>
        <RailSection title="Index">
          <div className="rs-stack">
            <button className={`index-btn${focus === ALL ? " active" : ""}`} onClick={() => setFocus(ALL)}>All indexes</button>
            {indexes.map((index) => <button key={index.id} className={`index-btn${focus === index.id ? " active" : ""}`} onClick={() => setFocus(index.id)}>{index.name}</button>)}
          </div>
        </RailSection>
      </aside>

      <aside style={RIGHT_RAIL_STYLE}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8798AA", marginBottom: 10 }}>{unitLabel} Report</div>
        <p style={{ fontSize: 12, lineHeight: 1.55, color: "#3B4B63" }}>
          Select a {unitLabel.toLowerCase()} from the left to view its index scores, statement results, and comparison to the organization average across campaigns.
        </p>
      </aside>

      <main style={CENTER_STYLE}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          <div className="hero">
            <div><h2>{dept.name}</h2><p className="hero-sub">{curCamp.labelLong}{previous ? ` (trend vs ${previous.label})` : ""}</p></div>
            <div className="kpi-strip">
              <div className="kpi"><div className="k-label">Total Index</div><div className="k-value">{total == null ? "N/A" : total.toFixed(1)}</div></div>
              {(() => {
                const orgTot = companyOverall(curCamp);
                const vsOrg = total == null || orgTot == null ? null : round1(total - orgTot);
                return (
                  <div className="kpi">
                    <div className="k-label">vs Org</div>
                    <div className="k-value" style={{ color: vsOrg == null ? "#6E7E96" : (vsOrg >= 0 ? "#59885D" : "#D46A6A") }}>{vsOrg == null ? "N/A" : f1(vsOrg)}</div>
                  </div>
                );
              })()}
              <div className="kpi"><div className="k-label">Change YoY</div><div className="k-value" style={{ color: totalDelta == null ? "#6E7E96" : (totalDelta >= 0 ? "#59885D" : "#D46A6A") }}>{totalDelta == null ? "—" : f1(totalDelta)}</div></div>
              <div className="kpi"><div className="k-label">Responses</div><div className="k-value">{dept.responses}</div></div>
              {unitLabel === "Brand" ? (
                <div className="kpi">
                  <div className="k-label">ENPS</div>
                  <div className="k-value" style={{ color: brandEnpsDelta == null ? "#152238" : brandEnpsDelta >= 0 ? "#9CB2A8" : "#C8B9B6" }}>
                    {brandEnpsCurrent == null ? "N/A" : brandEnpsCurrent.toFixed(1)}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {brandChartRows.length > 0 ? (
            <div className="card relative" style={{ marginBottom: 18 }}>
              <div className="card-head flex items-center justify-between gap-4">
                <h3 className="card-title">{activeIndex ? `${activeIndex.name} Statements` : "Statement Results"}</h3>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6E7E96]">Comparison to DWS</span>
              </div>
              <div className="card-body">
                <BrandComparisonChart rows={brandChartRows} axis={brandChartAxis} scoreColor={scoreColor} />
              </div>
              {buildLockButton("brand-chart", "brand chart")}
            </div>
          ) : null}

          <p className="slabel" style={{ marginBottom: 8 }}>Statement Results</p>
          <div className="stmt-wrap relative" style={{ marginBottom: 18 }}>
            <table className="stmt-table">
              <thead><tr><th>{tableCampaign.label}{tablePrevious ? ` vs ${tablePrevious.label}` : ""} · expand an index for statements</th>{tableCampaigns.map((campaign, campaignIndex) => <th key={campaign.id} className={`num${campaignIndex === tableCampaigns.length - 1 ? " col-group-end" : ""}`}><DateHead campaign={campaign} /></th>)}<th className="num col-group-start">Delta</th>{showVsOrg ? <th className="num col-group-start">vs Org</th> : null}</tr></thead>
              <tbody>
                {indexes.map((index) => {
                  const open = tableFocus === index.id;
                  const deptIndexForTable = (targetIndex, campaign) => {
                    const values = targetIndex.statements
                      .map((statement) => valueFor(statement.byDept[tableDeptId], campaign))
                      .filter((value): value is number => value != null);
                    return values.length > 0 ? round1(mean(values)) : null;
                  };
                  const cur = deptIndexForTable(index, tableCampaign);
                  const prevValue = tablePrevious ? deptIndexForTable(index, tablePrevious) : null;
                  const orgValue = companyIndex(index, tableCampaign);
                  const change = cur == null || prevValue == null ? null : round1(cur - prevValue);
                  const vsOrg = cur == null || orgValue == null ? null : round1(cur - orgValue);
                  return (
                    <>
                      <tr className={`acc-head${open ? " acc-open" : ""}`} onClick={() => setFocus(open ? ALL : index.id)}>
                        <td><div className="acc-name"><span className="acc-chev"><Chevron /></span><span className="acc-title">{index.name}</span></div></td>
                        {tableCampaigns.map((campaign, campaignIndex) => {
                          const value = deptIndexForTable(index, campaign);
                          if (value == null) {
                            return <td key={campaign.id} className={`cell${campaignIndex === tableCampaigns.length - 1 ? " col-group-end" : ""}`} style={{ color: "#6E7E96", background: "#F8FAFC" }}>N/A</td>;
                          }
                          const color = scoreColor(value);
                          return <td key={campaign.id} className={`cell${campaignIndex === tableCampaigns.length - 1 ? " col-group-end" : ""}`} style={{ background: color, color: textFor(color) }}>{value.toFixed(1)}</td>;
                        })}
                        <td className="cell col-group-start col-group-end" style={change == null ? { color: "#6E7E96" } : { background: activeDeltaStyle(change).bg, color: activeDeltaStyle(change).text }}>{change == null ? "—" : f1(change)}</td>
                        {showVsOrg ? <td className="cell col-group-start" style={vsOrg == null ? { color: "#6E7E96" } : { background: activeDeltaStyle(vsOrg).bg, color: activeDeltaStyle(vsOrg).text }}>{vsOrg == null ? "N/A" : f1(vsOrg)}</td> : null}
                      </tr>
                      {open && index.statements.map((statement) => {
                        const curValue = valueFor(statement.byDept[tableDeptId], tableCampaign);
                        const prevStatementValue = tablePrevious ? valueFor(statement.byDept[tableDeptId], tablePrevious) : null;
                        const orgStatementValue = companyStatement(statement, tableCampaign);
                        const statementChange = curValue == null || prevStatementValue == null ? null : round1(curValue - prevStatementValue);
                        const statementVsOrg = curValue == null || orgStatementValue == null ? null : round1(curValue - orgStatementValue);
                        return <tr key={statement.id} className="stmt-row"><td className="stmt-sub">{statement.text}</td>{tableCampaigns.map((campaign, campaignIndex) => { const value = valueFor(statement.byDept[tableDeptId], campaign); if (value == null) return <td key={campaign.id} className={`cell${campaignIndex === tableCampaigns.length - 1 ? " col-group-end" : ""}`} style={{ color: "#6E7E96", background: "#F8FAFC" }}>N/A</td>; const color = scoreColor(value); return <td key={campaign.id} className={`cell${campaignIndex === tableCampaigns.length - 1 ? " col-group-end" : ""}`} style={{ background: color, color: textFor(color) }}>{value.toFixed(1)}</td>; })}<td className="cell col-group-start col-group-end" style={statementChange == null ? { color: "#6E7E96" } : { background: activeDeltaStyle(statementChange).bg, color: activeDeltaStyle(statementChange).text }}>{statementChange == null ? "—" : f1(statementChange)}</td>{showVsOrg ? <td className="cell col-group-start" style={statementVsOrg == null ? { color: "#6E7E96" } : { background: activeDeltaStyle(statementVsOrg).bg, color: activeDeltaStyle(statementVsOrg).text }}>{statementVsOrg == null ? "N/A" : f1(statementVsOrg)}</td> : null}</tr>;
                      })}
                    </>
                  );
                })}
              </tbody>
            </table>
            {buildLockButton("statement-table", "statement table")}
          </div>

          {unitLabel === "Brand" &&
          supervisorHeatmapForDept &&
          supervisorHeatmapForDept.supervisors?.length > 0 &&
          supervisorHeatmapForDept.statements?.length > 0 ? (
            <>
              <p className="slabel" style={{ marginBottom: 8 }}>
                {data.supervisorHeatmap?.indexName || "Leadership"} Supervisor Heat Map
              </p>
              <div className="stmt-wrap" style={{ marginBottom: 18 }}>
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: 1180,
                      fontSize: 12.5,
                      tableLayout: "fixed",
                    }}
                  >
                    <colgroup>
                      <col style={{ width: 560 }} />
                      {supervisorHeatmapForDept.supervisors.map((supervisor) => (
                        <col key={`sup-col-${supervisor.id}`} style={{ width: 86 }} />
                      ))}
                      <col style={{ width: 78 }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th
                          style={{
                            background: "#E2E8EF",
                            textAlign: "left",
                            padding: "11px 12px",
                            border: "1px solid #D3DDE7",
                            color: "#6E7E96",
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                          }}
                        >
                          Leadership Statement
                        </th>
                        {supervisorHeatmapForDept.supervisors.map((supervisor) => {
                          const split = splitSupervisorName(supervisor.name);
                          return (
                            <th
                              key={supervisor.id}
                              style={{
                                background: "#E2E8EF",
                                textAlign: "center",
                                padding: "11px 8px",
                                border: "1px solid #D3DDE7",
                                color: "#6E7E96",
                                fontSize: 10,
                                fontWeight: 800,
                                letterSpacing: "0.12em",
                                textTransform: "uppercase",
                                lineHeight: 1.1,
                                height: 52,
                              }}
                            >
                              <span className="block">
                                <span className="block">{split.top}</span>
                                <span className="block">{split.bottom}</span>
                              </span>
                            </th>
                          );
                        })}
                        <th
                          style={{
                            background: "#E2E8EF",
                            textAlign: "center",
                            padding: "11px 8px",
                            border: "1px solid #8798AA",
                            color: "#6E7E96",
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Avg
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {supervisorHeatmapForDept.statements.map((statement) => {
                        const values = supervisorHeatmapForDept.supervisors
                          .map((supervisor) => statement.scoresBySupervisor?.[supervisor.id])
                          .filter((value) => typeof value === "number" && value > 0);
                        const rowAverage = values.length > 0 ? round1(mean(values)) : 0;
                        const rowAverageColor = scoreColor(rowAverage);
                        return (
                          <tr key={statement.id}>
                            <td
                              style={{
                                border: "1px solid #D3DDE7",
                                padding: "9px 12px",
                                color: "#152238",
                                lineHeight: 1.2,
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {statement.text}
                            </td>
                            {supervisorHeatmapForDept.supervisors.map((supervisor) => {
                              const value = statement.scoresBySupervisor?.[supervisor.id] ?? 0;
                              const color = scoreColor(value);
                              return (
                                <td
                                  key={`${statement.id}-${supervisor.id}`}
                                  style={{
                                    border: "1px solid #D3DDE7",
                                    textAlign: "center",
                                    padding: "8px",
                                    background: color,
                                    color: textFor(color),
                                    fontWeight: 800,
                                  }}
                                >
                                  {value.toFixed(1)}
                                </td>
                              );
                            })}
                            <td
                              style={{
                                border: "1px solid #8798AA",
                                textAlign: "center",
                                padding: "8px",
                                background: rowAverageColor,
                                color: textFor(rowAverageColor),
                                fontWeight: 900,
                              }}
                            >
                              {rowAverage.toFixed(1)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}

          {(unitLabel === "Brand"
            ? segments.filter((segment) => {
                const context = resolveVisualContext(`segment-${segment.id}`);
                const lockedDept = context.deptId || deptId;
                return segment.groups.some((group) => {
                  const cell = group.byDept[lockedDept];
                  return Boolean(cell && cell.responses >= minN);
                });
              })
            : segments.filter((segment) =>
                segment.groups.some((group) => {
                  const cell = group.byDept[deptId];
                  return Boolean(cell && cell.responses >= minN);
                })
              )).length > 0 ? (
            <>
              <p className="slabel" style={{ marginBottom: 6 }}>Results by Segment · {current.label} favorability</p>
              <div className="coavg-note" style={{ marginBottom: 10 }}><span className="dash" /> Dotted line marks the company-wide average.</div>
              <div className="seg-grid">
                {(unitLabel === "Brand"
                  ? segments.filter((segment) => {
                      const context = resolveVisualContext(`segment-${segment.id}`);
                      const lockedDept = context.deptId || deptId;
                      return segment.groups.some((group) => {
                        const cell = group.byDept[lockedDept];
                        return Boolean(cell && cell.responses >= minN);
                      });
                    })
                  : segments.filter((segment) =>
                      segment.groups.some((group) => {
                        const cell = group.byDept[deptId];
                        return Boolean(cell && cell.responses >= minN);
                      })
                    )).map((segment) => {
                  const context = resolveVisualContext(`segment-${segment.id}`);
                  const lockedDept = context.deptId || deptId;
                  const lockedCampaign = timeline.find((item) => item.id === context.campaignId) ?? curCamp;
                  return (
                    <SegmentCard
                      key={segment.id}
                      segment={segment}
                      deptId={lockedDept}
                      minN={minN}
                      companyAvg={companyOverall(lockedCampaign) ?? 0}
                      scoreColor={scoreColor}
                      lockButton={buildLockButton(`segment-${segment.id}`, `${segment.label} segment`)}
                    />
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </main>

      <aside className="rail right">
        <EEContextRail
          howToRead={showVsOrg
            ? `Cells are favorability points. Delta compares the selected survey to the prior survey; vs Org compares this ${unitLabel.toLowerCase()} to the company average.`
            : "Cells are favorability points. Delta compares the selected survey to the prior survey."}
          scoreLegendLabel="Score Scale (Yellow-Blue)"
          scoreLegendGradient="linear-gradient(90deg, #D7B35A 0%, #FFFFFF 50%, #3F5F86 100%)"
          deltaLegendGradient="linear-gradient(90deg, #D46A6A 0%, #F5EFEF 50%, #59885D 100%)"
        />
      </aside>
    </div>
  );
}

