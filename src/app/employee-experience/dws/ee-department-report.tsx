// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import { toDepartmentReportData } from "./ee-demo-fixture";
import {
  ClientMark,
  DateHead,
  EEReportStyles,
  RailSection,
  Chevron,
  deltaStyle,
  f1,
  isLightBand,
  makeScoreColor,
  mean,
  round1,
} from "./ee-report-kit";
import { EEContextRail } from "./ee-context-rail";

const REPORT_DATA = toDepartmentReportData();
const ALL = "all";
const PREFERRED_CURRENT_CAMPAIGN = "May 2026";
const PREFERRED_PRIOR_CAMPAIGN = "Aug 2025";

function valueFor(cell, campaign) {
  if (!cell) return 0;
  return campaign.isCurrent ? cell.current : cell.comparisons[campaign.id] ?? 0;
}

function textFor(color) {
  return isLightBand(color) ? "#1C252A" : "#fff";
}

function campaignMatches(campaign, label) {
  const source = String(campaign?.labelLong || campaign?.label || "").toLowerCase();
  return source === label.toLowerCase();
}

function SegmentCard({ segment, deptId, minN, companyAvg, scoreColor }) {
  const rows = segment.groups
    .map((group) => {
      const cell = group.byDept[deptId];
      return cell && cell.responses >= minN ? { ...group, ...cell } : null;
    })
    .filter(Boolean)
    .sort((left, right) => right.current - left.current);

  if (rows.length === 0) return null;

  return (
    <div className="card">
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
                <div className="br-bar" style={{ width: `${pct(row.value)}%`, background: color }}>
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
}: {
  data: any;
  unitLabel?: string;
  reportHeading?: string;
}) {
  const { client, current, comparisons, scale, departments = [], indexes = [], segments } = data;
  const scoreColor = makeScoreColor(scale);
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

  if (!departments.length || !indexes.length) {
    return (
      <div className="canvas">
        <EEReportStyles />
        <main className="center">
          <div className="center-inner">
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
  const visibleSegments = useMemo(
    () =>
      segments.filter((segment) =>
        segment.groups.some((group) => {
          const cell = group.byDept[deptId];
          return Boolean(cell && cell.responses >= minN);
        })
      ),
    [deptId, minN, segments]
  );

  const deptIndex = (index, campaign) => round1(mean(index.statements.map((statement) => valueFor(statement.byDept[deptId], campaign))));
  const unitIndex = (index, campaign, unitId) => round1(mean(index.statements.map((statement) => valueFor(statement.byDept[unitId], campaign))));
  const deptTotal = (campaign) => round1(mean(indexes.flatMap((index) => index.statements.map((statement) => valueFor(statement.byDept[deptId], campaign)))));
  const companyStatement = (statement, campaign) => {
    let num = 0;
    let den = 0;
    departments.forEach((item) => {
      num += valueFor(statement.byDept[item.id], campaign) * item.responses;
      den += item.responses;
    });
    return round1(num / den);
  };
  const companyIndex = (index, campaign) => round1(mean(index.statements.map((statement) => companyStatement(statement, campaign))));
  const companyOverall = (campaign) => round1(mean(indexes.flatMap((index) => index.statements.map((statement) => companyStatement(statement, campaign)))));
  const showVsOrg = unitLabel !== "Brand";
  const activeIndex = indexes.find((index) => index.id === focus) ?? indexes[0] ?? null;
  const brandChartRows = activeIndex
    ? activeIndex.statements
        .map((statement) => {
          const value = valueFor(statement.byDept[deptId], curCamp);
          const org = companyStatement(statement, curCamp);
          return {
            id: statement.id,
            name: statement.text,
            value,
            delta: round1(value - org),
            org,
          };
        })
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
  const totalDelta = previous ? round1(total - deptTotal(previous)) : null;
  return (
    <div className="canvas">
      <EEReportStyles />
      <aside className="rail left">
        <div className="client-card"><ClientMark client={client} /><div className="client-head">{reportHeading}</div></div>
        <RailSection title={unitLabel}>
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
            {indexes.map((index) => <button key={index.id} className={`index-btn${focus === index.id ? " active" : ""}`} onClick={() => setFocus(index.id)}>{index.name}</button>)}
          </div>
        </RailSection>
      </aside>

      <main className="center">
        <div className="center-inner">
          <div className="hero">
            <div><h2>{dept.name}</h2><p className="hero-sub">{curCamp.labelLong}{previous ? ` (trend vs ${previous.label})` : ""}</p></div>
            <div className="kpi-strip">
              <div className="kpi"><div className="k-label">Total Index</div><div className="k-value">{total.toFixed(1)}</div></div>
              <div className="kpi"><div className="k-label">Change YoY</div><div className="k-value" style={{ color: totalDelta == null ? "#6E7E96" : totalDelta >= 0 ? "#9CB2A8" : "#C8B9B6" }}>{totalDelta == null ? "—" : f1(totalDelta)}</div></div>
              <div className="kpi"><div className="k-label">Responses</div><div className="k-value">{dept.responses}</div></div>
            </div>
          </div>

          {unitLabel === "Brand" ? (
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="card-head flex items-center justify-between gap-4">
                <h3 className="card-title">{activeIndex ? `${activeIndex.name} Statements` : "Statement Results"}</h3>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6E7E96]">Comparison to CSG</span>
              </div>
              <div className="card-body">
                <BrandComparisonChart rows={brandChartRows} axis={brandChartAxis} scoreColor={scoreColor} />
              </div>
            </div>
          ) : null}

          <p className="slabel" style={{ marginBottom: 8 }}>Statement Results</p>
          <div className="stmt-wrap" style={{ marginBottom: 18 }}>
            <table className="stmt-table">
              <thead><tr><th>{curCamp.label}{previous ? ` vs ${previous.label}` : ""} · expand an index for statements</th>{campaigns.map((campaign, campaignIndex) => <th key={campaign.id} className={`num${campaignIndex === campaigns.length - 1 ? " col-group-end" : ""}`}><DateHead campaign={campaign} /></th>)}<th className="num col-group-start">Delta</th>{showVsOrg ? <th className="num">vs Org</th> : null}</tr></thead>
              <tbody>
                {indexes.map((index) => {
                  const open = focus === index.id;
                  const cur = deptIndex(index, curCamp);
                  const change = previous ? round1(cur - deptIndex(index, previous)) : null;
                  const vsOrg = round1(cur - companyIndex(index, curCamp));
                  return (
                    <>
                      <tr className={`acc-head${open ? " acc-open" : ""}`} onClick={() => setFocus(open ? ALL : index.id)}>
                        <td><div className="acc-name"><span className="acc-chev"><Chevron /></span><span className="acc-title">{index.name}</span></div></td>
                        {campaigns.map((campaign, campaignIndex) => { const value = deptIndex(index, campaign); const color = scoreColor(value); return <td key={campaign.id} className={`cell${campaignIndex === campaigns.length - 1 ? " col-group-end" : ""}`} style={{ background: color, color: textFor(color) }}>{value.toFixed(1)}</td>; })}
                        <td className="cell col-group-start" style={change == null ? { color: "#6E7E96" } : { background: deltaStyle(change).bg, color: deltaStyle(change).text }}>{change == null ? "—" : f1(change)}</td>
                        {showVsOrg ? <td className="cell" style={{ background: deltaStyle(vsOrg).bg, color: deltaStyle(vsOrg).text }}>{f1(vsOrg)}</td> : null}
                      </tr>
                      {open && index.statements.map((statement) => {
                        const curValue = valueFor(statement.byDept[deptId], curCamp);
                        const statementChange = previous ? round1(curValue - valueFor(statement.byDept[deptId], previous)) : null;
                        const statementVsOrg = round1(curValue - companyStatement(statement, curCamp));
                        return <tr key={statement.id} className="stmt-row"><td className="stmt-sub">{statement.text}</td>{campaigns.map((campaign, campaignIndex) => { const value = valueFor(statement.byDept[deptId], campaign); const color = scoreColor(value); return <td key={campaign.id} className={`cell${campaignIndex === campaigns.length - 1 ? " col-group-end" : ""}`} style={{ background: color, color: textFor(color) }}>{value.toFixed(1)}</td>; })}<td className="cell col-group-start" style={statementChange == null ? { color: "#6E7E96" } : { background: deltaStyle(statementChange).bg, color: deltaStyle(statementChange).text }}>{statementChange == null ? "—" : f1(statementChange)}</td>{showVsOrg ? <td className="cell" style={{ background: deltaStyle(statementVsOrg).bg, color: deltaStyle(statementVsOrg).text }}>{f1(statementVsOrg)}</td> : null}</tr>;
                      })}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {visibleSegments.length > 0 ? (
            <>
              <p className="slabel" style={{ marginBottom: 6 }}>Results by Segment · {current.label} favorability</p>
              <div className="coavg-note" style={{ marginBottom: 10 }}><span className="dash" /> Dotted line marks the company-wide average.</div>
              <div className="seg-grid">{visibleSegments.map((segment) => <SegmentCard key={segment.id} segment={segment} deptId={deptId} minN={minN} companyAvg={companyOverall(curCamp)} scoreColor={scoreColor} />)}</div>
            </>
          ) : null}
        </div>
      </main>

      <aside className="rail right">
        <EEContextRail
          howToRead={showVsOrg
            ? `Cells are favorability points. Delta compares the selected survey to the prior survey; vs Org compares this ${unitLabel.toLowerCase()} to the company average.`
            : "Cells are favorability points. Delta compares the selected survey to the prior survey."}
        />
      </aside>
    </div>
  );
}
