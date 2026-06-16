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

function BrandComparisonChart({ rows, avg, axis, scoreColor }) {
  const pct = (value) => ((Math.max(axis.min, Math.min(axis.max, value)) - axis.min) / (axis.max - axis.min)) * 100;
  return (
    <div className="chart" style={{ "--label-col": "280px", "--gap-col": "140px" }}>
      <style>{`
        .br-track{height:24px;background:#F1F4F7;border-radius:0 7px 7px 0;position:relative}
        .br-bar{position:absolute;left:0;top:0;bottom:0;border-radius:0 7px 7px 0}
        .br-chip{position:absolute;left:8px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.95);color:#152238;border:1px solid rgba(21,34,56,.16);font-size:12px;font-weight:800;padding:3px 8px;border-radius:6px}
        .br-org{position:absolute;top:2px;bottom:2px;width:0;border-left:2.5px solid rgba(21,34,56,.55);z-index:5}
        .br-org-dot{position:absolute;top:50%;width:16px;height:16px;border-radius:999px;background:#152238;border:2px solid #fff;transform:translate(-50%,-50%);box-shadow:0 1px 3px rgba(0,0,0,.32);z-index:6}
        .br-gap-col{display:flex;align-items:center;justify-content:center;padding-left:10px}
        .br-gap-col-head{font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#6E7E96;text-align:center;line-height:1.25}
        .br-gap-pill{min-width:96px;padding:4px 10px;border-radius:999px;text-align:center;font-size:13px;font-weight:900;border:1px solid}
      `}</style>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,min(var(--label-col),50%)) minmax(0,1fr) var(--gap-col)",
          alignItems: "end",
          columnGap: 16,
          marginBottom: 6,
        }}
      >
        <div />
        <div />
        <div className="br-gap-col">
          <div className="br-gap-col-head">Comparison to CSG</div>
        </div>
      </div>
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
            <div className="bar-row" key={row.id}>
              <div className="bar-label" title={row.name} style={{ whiteSpace: "normal" }}>{row.name}</div>
              <div className="br-track">
                <div className="br-bar" style={{ width: `${pct(row.value)}%`, background: color }}>
                  <div className="br-chip">{row.value.toFixed(1)}</div>
                </div>
                <div className="br-org" style={{ left: `${pct(avg)}%` }} />
                <div className="br-org-dot" style={{ left: `${pct(avg)}%` }} />
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
      <div className="bar-row" style={{ padding: 0 }}><div /><div className="axis">{axis.ticks.map((tick) => <div key={tick} className="tick" style={{ left: `${pct(tick)}%` }}>{tick}</div>)}</div><div /></div>
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
  const [focus, setFocus] = useState(ALL);
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
  const activeIndex = focus === ALL ? null : indexes.find((index) => index.id === focus) ?? null;
  const brandChartRows = useMemo(() => {
    const getValue = (item) => {
      if (activeIndex) return unitIndex(activeIndex, curCamp, item.id);
      return round1(mean(indexes.flatMap((index) => index.statements.map((statement) => valueFor(statement.byDept[item.id], curCamp)))));
    };
    const avgValue = activeIndex ? companyIndex(activeIndex, curCamp) : companyOverall(curCamp);
    return departments
      .map((item) => {
        const value = getValue(item);
        return {
          id: item.id,
          name: item.name,
          value,
          delta: round1(value - avgValue),
        };
      })
      .sort((left, right) => right.value - left.value);
  }, [activeIndex, curCamp, departments, indexes]);
  const brandChartAverage = activeIndex ? companyIndex(activeIndex, curCamp) : companyOverall(curCamp);
  const brandChartAxis = useMemo(() => {
    const allValues = [...brandChartRows.map((row) => row.value), brandChartAverage];
    const min = Math.floor((Math.min(...allValues) - 2) / 5) * 5;
    const max = Math.ceil((Math.max(...allValues) + 2) / 5) * 5;
    const ticks = [];
    for (let tick = min; tick <= max; tick += 5) ticks.push(tick);
    return { min, max, ticks };
  }, [brandChartRows, brandChartAverage]);

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
            <button className={`index-btn${focus === ALL ? " active" : ""}`} onClick={() => setFocus(ALL)}>All indexes</button>
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
              <div className="card-head">
                <h3 className="card-title">Brand Comparison</h3>
              </div>
              <div className="card-body">
                <BrandComparisonChart rows={brandChartRows} avg={brandChartAverage} axis={brandChartAxis} scoreColor={scoreColor} />
              </div>
            </div>
          ) : null}

          <p className="slabel" style={{ marginBottom: 8 }}>Statement Results</p>
          <div className="stmt-wrap" style={{ marginBottom: 18 }}>
            <table className="stmt-table">
              <thead><tr><th>{curCamp.label}{previous ? ` vs ${previous.label}` : ""} · expand an index for statements</th>{campaigns.map((campaign, campaignIndex) => <th key={campaign.id} className={`num${campaignIndex === campaigns.length - 1 ? " col-group-end" : ""}`}><DateHead campaign={campaign} /></th>)}<th className="num col-group-start">Delta</th><th className="num">vs Org</th></tr></thead>
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
                        <td className="cell" style={{ background: deltaStyle(vsOrg).bg, color: deltaStyle(vsOrg).text }}>{f1(vsOrg)}</td>
                      </tr>
                      {open && index.statements.map((statement) => {
                        const curValue = valueFor(statement.byDept[deptId], curCamp);
                        const statementChange = previous ? round1(curValue - valueFor(statement.byDept[deptId], previous)) : null;
                        const statementVsOrg = round1(curValue - companyStatement(statement, curCamp));
                        return <tr key={statement.id} className="stmt-row"><td className="stmt-sub">{statement.text}</td>{campaigns.map((campaign, campaignIndex) => { const value = valueFor(statement.byDept[deptId], campaign); const color = scoreColor(value); return <td key={campaign.id} className={`cell${campaignIndex === campaigns.length - 1 ? " col-group-end" : ""}`} style={{ background: color, color: textFor(color) }}>{value.toFixed(1)}</td>; })}<td className="cell col-group-start" style={statementChange == null ? { color: "#6E7E96" } : { background: deltaStyle(statementChange).bg, color: deltaStyle(statementChange).text }}>{statementChange == null ? "—" : f1(statementChange)}</td><td className="cell" style={{ background: deltaStyle(statementVsOrg).bg, color: deltaStyle(statementVsOrg).text }}>{f1(statementVsOrg)}</td></tr>;
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
          howToRead={`Cells are favorability points. Delta compares the selected survey to the prior survey; vs Org compares this ${unitLabel.toLowerCase()} to the company average.`}
        />
      </aside>
    </div>
  );
}
