// @ts-nocheck
"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { usePersistedDashboardFilter } from "@/hooks/use-persisted-dashboard-filter";
import { toSupervisorReportData } from "./ee-demo-fixture";
import {
  ClientMark,
  DateHead,
  EmbeddedFilterCard,
  EEReportStyles,
  FilterStack,
  PillOptionRow,
  RailSection,
  f1,
  isLightBand,
  dwsScoreColor,
  makeGradientColor,
  dwsDeltaStyle,
  mean,
  round1,
} from "./ee-report-kit";
import { EEContextRail } from "./ee-context-rail";
import { RegisteredVisualExportFrame } from "@/components/dashboard/registered-visual-export-frame";
import { useVisualExportRegistry, useVisualRegistryActive } from "@/components/dashboard/visual-export-registry";
import { buildDashboardExportFilename } from "@/lib/dashboard/export-visual";

const REPORT_DATA = toSupervisorReportData();
const ORG_MARKER = "#152238";
const PREFERRED_CURRENT_CAMPAIGN = "May 2026";
const PREFERRED_PRIOR_CAMPAIGN = "Aug 2025";

function textFor(color) {
  return isLightBand(color) ? "#1C252A" : "#fff";
}

function campaignMatches(campaign, label) {
  const source = String(campaign?.labelLong || campaign?.label || "").toLowerCase();
  return source === label.toLowerCase();
}

function hasScore(value) {
  return typeof value === "number" && value > 0;
}

function SupBarChart({ rows, axis, scoreColor }) {
  const pct = (value) => ((Math.max(axis.min, Math.min(axis.max, value)) - axis.min) / (axis.max - axis.min)) * 100;
  return (
    <div className="chart" style={{ "--label-col": "300px", "--gap-col": "140px" }}>
      <style>{`
        .sr-track{height:24px;background:#F1F4F7;border-radius:0 7px 7px 0;position:relative}
        .sr-bar{position:absolute;left:0;top:0;bottom:0;border-radius:0 7px 7px 0}
        .sr-chip{position:absolute;left:8px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.95);color:#152238;border:1px solid rgba(21,34,56,.16);font-size:12px;font-weight:800;padding:3px 8px;border-radius:6px}
        .sr-org{position:absolute;top:2px;bottom:2px;width:0;border-left:2.5px solid rgba(21,34,56,.55);z-index:5}
        .sr-org-dot{position:absolute;top:50%;width:16px;height:16px;border-radius:999px;background:${ORG_MARKER};border:2px solid #fff;transform:translate(-50%,-50%);box-shadow:0 1px 3px rgba(0,0,0,.32);z-index:6}
        .sr-row{display:grid;grid-template-columns:minmax(0,min(var(--label-col),50%)) minmax(0,1fr) var(--gap-col);align-items:center;column-gap:16px;min-height:34px;padding:2px 0}
        .sr-axis-row{display:grid;grid-template-columns:minmax(0,min(var(--label-col),50%)) minmax(0,1fr) var(--gap-col);align-items:center;column-gap:16px;padding:0}
        .sr-gap-col{display:flex;align-items:center;justify-content:center;padding-left:10px}
        .sr-gap-pill{min-width:96px;padding:4px 10px;border-radius:999px;text-align:center;font-size:13px;font-weight:900;border:1px solid}
      `}</style>
      <div className="plot">
        <div
          className="grid-overlay"
          style={{ right: "var(--gap-col)" }}
        >
          {axis.ticks.map((tick) => <div key={tick} className="gridline" style={{ left: `${pct(tick)}%` }} />)}
        </div>
        {rows.map((row) => {
          const color = scoreColor(row.value);
          const ahead = row.value >= row.org;
          const gap = round1(row.value - row.org);
          const gapTone = ahead
            ? { bg: "#DCEFE2", fg: "#2F6A45", border: "#9BC6A9" }
            : { bg: "#F4DEDD", fg: "#8A3D3A", border: "#D5A3A0" };
          return (
            <div className="sr-row" key={row.id}>
              <div className="bar-label" title={row.text} style={{ whiteSpace: "normal" }}>{row.text}</div>
              <div className="sr-track">
                <div className="sr-bar" style={{ width: `${pct(row.value)}%`, background: color, outline: "1px solid rgba(0,0,0,0.18)" }}><div className="sr-chip">{row.value.toFixed(1)}</div></div>
                <div className="sr-org" style={{ left: `${pct(row.org)}%` }} />
                <div className="sr-org-dot" style={{ left: `${pct(row.org)}%` }} />
              </div>
              <div className="sr-gap-col">
                <div className="sr-gap-pill" style={{ background: gapTone.bg, color: gapTone.fg, borderColor: gapTone.border }}>
                  {f1(gap)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="sr-axis-row"><div /><div className="axis">{axis.ticks.map((tick) => <div key={tick} className="tick" style={{ left: `${pct(tick)}%` }}>{tick}</div>)}</div><div /></div>
    </div>
  );
}

export function EESupervisorReport({
  data,
  benchmarkLabel = "CSG",
  fieldLayout = false,
  chromeless = false,
  basinReportSurface = false,
  filtersPortalId,
  filterPersistenceKey,
}: {
  data: any;
  benchmarkLabel?: string;
  fieldLayout?: boolean;
  chromeless?: boolean;
  basinReportSurface?: boolean;
  filtersPortalId?: string;
  filterPersistenceKey?: string;
}) {
  const { client, current, comparisons, scale, supervisors = [], index, display } = data;
  const exportRegistry = useVisualExportRegistry();
  const registryActive = useVisualRegistryActive();
  const registryOn = registryActive && Boolean(exportRegistry);
  // No prior campaign → suppress all delta / YoY / campaign-selection UI.
  const hasComparison = comparisons.length > 0;
  const scoreColor = makeGradientColor(scale.min, scale.max);
  const barAxis = display?.barAxis ?? { min: 55, max: 100, ticks: [60, 70, 80, 90, 100] };
  const [stmtSort, setStmtSort] = useState<{ col: "score" | "vsorg"; dir: "desc" | "asc" }>({ col: "score", dir: "desc" });
  const toggleStmtSort = (col: "score" | "vsorg") =>
    setStmtSort((prev) => (prev.col === col ? { col, dir: prev.dir === "desc" ? "asc" : "desc" } : { col, dir: "desc" }));
  const sortArrow = (col: "score" | "vsorg") =>
    fieldLayout && stmtSort.col === col ? (stmtSort.dir === "desc" ? " ↓" : " ↑") : "";
  const [supervisorId, setSupervisorId] = usePersistedDashboardFilter(
    filterPersistenceKey,
    "supervisorId",
    () => supervisors[0]?.id ?? ""
  );
  const [currentCampaignId, setCurrentCampaignId] = usePersistedDashboardFilter(filterPersistenceKey, "currentCampaignId", () => {
    const preferredCurrent = [current, ...comparisons].find((campaign) => campaignMatches(campaign, PREFERRED_CURRENT_CAMPAIGN));
    return preferredCurrent?.id ?? current.id;
  });
  const [priorCampaignId, setPriorCampaignId] = usePersistedDashboardFilter(filterPersistenceKey, "priorCampaignId", () => {
    const preferredPrior = comparisons.find((campaign) => campaignMatches(campaign, PREFERRED_PRIOR_CAMPAIGN));
    return preferredPrior?.id ?? comparisons[comparisons.length - 1]?.id ?? "";
  });
  const supervisor = supervisors.find((item) => item.id === supervisorId) ?? supervisors[0];
  const [filtersPortalNode, setFiltersPortalNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!chromeless || !filtersPortalId) {
      setFiltersPortalNode(null);
      return;
    }
    setFiltersPortalNode(document.getElementById(filtersPortalId));
  }, [chromeless, filtersPortalId]);
  const timeline = useMemo(
    () => [...comparisons.map((item) => ({ ...item, key: item.id })), { ...current, key: "current" }],
    [comparisons, current]
  );
  const curCamp = timeline.find((item) => item.id === currentCampaignId) ?? current;
  const previous = timeline.find((item) => item.id === priorCampaignId) ?? comparisons[comparisons.length - 1] ?? null;
  const campaigns = previous ? [previous, curCamp] : [curCamp];
  const hasData = supervisors.length > 0 && (index?.statements?.length ?? 0) > 0;

  const supervisorValue = (statement, campaign) => {
    const cell = statement.bySup[supervisorId];
    if (!cell) return null;
    const value = campaign.key === "current" ? cell.current : cell.comparisons[campaign.key];
    return hasScore(value) ? value : null;
  };
  const orgValue = (statement, campaign) => {
    const value = campaign.key === "current" ? statement.org.current : statement.org.comparisons[campaign.key];
    return hasScore(value) ? value : null;
  };
  const barRows = useMemo(
    () =>
      hasData
        ? index.statements
            .map((statement) => ({
              id: statement.id,
              text: statement.text,
              value: supervisorValue(statement, curCamp),
              org: orgValue(statement, curCamp),
            }))
            .filter((row) => row.value != null && row.org != null)
            .sort((left, right) => right.value - left.value)
        : [],
    [hasData, index?.statements, supervisorId, curCamp]
  );
  const statementRows = useMemo(() => {
    if (!fieldLayout) return barRows;
    const metric = (row) => (stmtSort.col === "vsorg" ? row.value - row.org : row.value);
    return [...barRows].sort((left, right) =>
      stmtSort.dir === "desc" ? metric(right) - metric(left) : metric(left) - metric(right)
    );
  }, [barRows, fieldLayout, stmtSort]);

  if (!hasData) {
    return (
      <div className="canvas">
        <EEReportStyles />
        <main className="center">
          <div className="center-inner">
            <p style={{ color: "#6E7E96", fontSize: 14 }}>No supervisor report data is available for this campaign yet.</p>
          </div>
        </main>
      </div>
    );
  }

  // Headline scores read the projection's person averages: the supervisor's score
  // is the average of their people, the org score the average of everyone.
  const readScore = (cell, campaign) => {
    if (!cell) return null;
    const value = campaign?.key === "current" ? cell.current : cell.comparisons?.[campaign?.key];
    return hasScore(value) ? round1(value) : null;
  };
  const supervisorOverall = readScore(index.score?.byGroup?.[supervisorId], curCamp);
  const supervisorPrevious = previous ? readScore(index.score?.byGroup?.[supervisorId], previous) : null;
  const orgOverall = readScore(index.score?.org, curCamp);
  const overallDelta =
    supervisorOverall == null || supervisorPrevious == null ? null : round1(supervisorOverall - supervisorPrevious);
  const vsOrg = supervisorOverall == null || orgOverall == null ? null : round1(supervisorOverall - orgOverall);
  const supExportFile = (section: string) =>
    buildDashboardExportFilename({ client: "dws", perspective: `supervisor-report-${section}`, campaign: curCamp?.label });
  if (registryOn && exportRegistry) {
    exportRegistry.setMeta({
      title: "Supervisor Report",
      filters: [supervisor?.name, curCamp?.labelLong || curCamp?.label].filter((value) => Boolean(value)),
    });
  }

  const timelineRecentFirst = [...timeline].reverse();
  const railControls = (
    <FilterStack>
      {chromeless ? (
        <EmbeddedFilterCard title="Supervisor">
          <PillOptionRow
            value={supervisorId}
            onChange={setSupervisorId}
            options={supervisors.map((item) => ({ id: item.id, label: item.name }))}
          />
          <p className="rs-hint" style={{ margin: "9px 2px 0" }}>
            {supervisor.dept} · {supervisor.responses} responses
          </p>
        </EmbeddedFilterCard>
      ) : (
        <RailSection title="Supervisor" defaultOpen>
          <select className="rail-select" value={supervisorId} onChange={(event) => setSupervisorId(event.target.value)}>
            {supervisors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <p className="rs-hint">{supervisor.dept} · {supervisor.responses} responses</p>
        </RailSection>
      )}
      {hasComparison ? (
        chromeless ? (
          <EmbeddedFilterCard title="Campaign Selection">
            <div className="flex flex-col gap-3">
              <div>
                <span className="mb-1.5 block text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8798AA]">Current</span>
                <PillOptionRow
                  value={curCamp.id}
                  onChange={setCurrentCampaignId}
                  options={timelineRecentFirst.map((campaign) => ({ id: campaign.id, label: campaign.labelLong || campaign.label }))}
                />
              </div>
              <div>
                <span className="mb-1.5 block text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8798AA]">Compared To</span>
                <PillOptionRow
                  value={previous?.id ?? ""}
                  onChange={setPriorCampaignId}
                  options={timelineRecentFirst.filter((campaign) => campaign.id !== curCamp.id).map((campaign) => ({ id: campaign.id, label: campaign.labelLong || campaign.label }))}
                />
              </div>
            </div>
          </EmbeddedFilterCard>
        ) : (
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
        )
      ) : null}
    </FilterStack>
  );

  return (
    <div className={chromeless ? "canvas fr-persp-main" : "canvas"} style={chromeless ? { background: basinReportSurface ? "#F4F4EF" : "#fff", margin: 0, padding: 0 } : undefined}>
      <EEReportStyles />
      {chromeless && filtersPortalNode ? createPortal(railControls, filtersPortalNode) : null}
      {!chromeless ? (
      <aside className="rail left">
        <div className="client-card"><ClientMark client={client} /><div className="client-head">SUPERVISOR REPORT</div></div>
        {railControls}
      </aside>
      ) : null}

      <main className="center" style={chromeless ? { margin: 0, padding: 0, background: basinReportSurface ? "#F4F4EF" : "#fff" } : undefined}>
        <div className="center-inner">
          <div className="hero">
            <div><h2>{supervisor.name}</h2><p className="hero-sub">{curCamp.labelLong}{previous ? ` (trend vs ${previous.label})` : ""}</p></div>
            <div className="kpi-strip">
              <div className="kpi"><div className="k-label">{index.name} Index</div><div className="k-value">{supervisorOverall == null ? "N/A" : supervisorOverall.toFixed(1)}</div></div>
              <div className="kpi"><div className="k-label">vs Org</div><div className="k-value" style={{ color: vsOrg == null ? "#6E7E96" : vsOrg >= 0 ? "#59885D" : "#D46A6A" }}>{vsOrg == null ? "N/A" : f1(vsOrg)}</div></div>
              {hasComparison ? <div className="kpi"><div className="k-label">Change YoY</div><div className="k-value" style={{ color: overallDelta == null ? "#6E7E96" : overallDelta >= 0 ? "#59885D" : "#D46A6A" }}>{overallDelta == null ? "—" : f1(overallDelta)}</div></div> : null}
              <div className="kpi"><div className="k-label">Responses</div><div className="k-value">{supervisor.responses}</div></div>
            </div>
          </div>

          <RegisteredVisualExportFrame order={10} label="Download chart" filename={supExportFile("leadership-effectiveness")}>
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-head flex items-center justify-between gap-4">
              <h3 className="card-title">Leadership Effectiveness</h3>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6E7E96]">Comparison to {benchmarkLabel}</span>
            </div>
            <div className="card-body"><SupBarChart rows={barRows} axis={barAxis} scoreColor={scoreColor} /></div>
          </div>
          </RegisteredVisualExportFrame>

          <RegisteredVisualExportFrame order={20} label="Download table" filename={supExportFile("statement-results")}>
          <p className="slabel" style={{ marginBottom: 8 }}>Statement Results · {curCamp.label}{previous ? ` vs ${previous.label}` : ""}</p>
          <div className="stmt-wrap">
            <table className="stmt-table">
              <thead><tr><th>Manager statement</th>{campaigns.map((campaign) => <th key={campaign.id} className="num" onClick={fieldLayout ? () => toggleStmtSort("score") : undefined} style={fieldLayout ? { cursor: "pointer", userSelect: "none" } : undefined}><DateHead campaign={campaign} />{sortArrow("score")}</th>)}{hasComparison ? <th className="num col-group-start">Delta</th> : null}<th className="num col-group-start" onClick={fieldLayout ? () => toggleStmtSort("vsorg") : undefined} style={fieldLayout ? { cursor: "pointer", userSelect: "none" } : undefined}>vs Org{sortArrow("vsorg")}</th></tr></thead>
              <tbody>
                {statementRows.map((row) => {
                  const statement = index.statements.find((item) => item.id === row.id);
                  const currentValue = supervisorValue(statement, curCamp);
                  const previousValue = previous ? supervisorValue(statement, previous) : null;
                  const change =
                    currentValue == null || previousValue == null ? null : round1(currentValue - previousValue);
                  const statementOrg = orgValue(statement, curCamp);
                  const orgGap = currentValue == null || statementOrg == null ? null : round1(currentValue - statementOrg);
                  return (
                    <tr key={statement.id} className="stmt-row">
                      <td className="stmt">{statement.text}</td>
                      {campaigns.map((campaign) => {
                        const value = supervisorValue(statement, campaign);
                        if (value == null) {
                          return (
                            <td key={campaign.id} className="cell" style={{ color: "#6E7E96", background: "#F8FAFC" }}>
                              N/A
                            </td>
                          );
                        }
                        const color = scoreColor(value);
                        return <td key={campaign.id} className="cell" style={{ background: color, color: textFor(color) }}>{value.toFixed(1)}</td>;
                      })}
                      {hasComparison ? <td className="cell col-group-start col-group-end" style={change == null ? { color: "#6E7E96" } : { background: dwsDeltaStyle(change).bg, color: dwsDeltaStyle(change).text }}>{change == null ? "—" : f1(change)}</td> : null}
                      <td className="cell col-group-start" style={orgGap == null ? { color: "#6E7E96" } : { background: dwsDeltaStyle(orgGap).bg, color: dwsDeltaStyle(orgGap).text }}>{orgGap == null ? "N/A" : f1(orgGap)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </RegisteredVisualExportFrame>
        </div>
      </main>

      {!chromeless ? (
      <aside className="rail right">
        <EEContextRail
          scale={scale}
          howToRead="Bar length and bar value show supervisor score. The vertical line and dot mark the organization average, and Org Comparison shows the score gap versus that marker."
          extraLegend={(
            <div className="flex items-center gap-2 text-[12px] text-[#3B4B63]">
              <span className="inline-block h-0 w-6 border-t-[2.5px] border-[#152238]" />
              <span className="inline-block h-4 w-4 rounded-full border-2 border-white bg-[#152238] shadow-[0_1px_3px_rgba(0,0,0,.32)]" />
              <span>Organization average marker</span>
            </div>
          )}
        />
      </aside>
      ) : null}
    </div>
  );
}

