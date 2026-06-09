// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { toDepartmentReportData } from "./ee-demo-fixture";
import {
  ClientMark,
  DateHead,
  EEReportStyles,
  InsightCard,
  RailSection,
  Chevron,
  deltaStyle,
  f1,
  isLightBand,
  makeScoreColor,
  mean,
  round1,
} from "./ee-report-kit";

const REPORT_DATA = toDepartmentReportData();
const ALL = "all";

function valueFor(cell, campaign) {
  return campaign.isCurrent ? cell.current : cell.comparisons[campaign.id] ?? 0;
}

function textFor(color) {
  return isLightBand(color) ? "#1C252A" : "#fff";
}

function SegmentCard({ segment, deptId, minN, companyAvg, scoreColor }) {
  const rows = segment.groups
    .map((group) => {
      const cell = group.byDept[deptId];
      return cell && cell.responses >= minN ? { ...group, ...cell } : null;
    })
    .filter(Boolean)
    .sort((left, right) => right.current - left.current);

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
  const [asOf, setAsOf] = useState(current.id);
  const timeline = useMemo(
    () => [...comparisons.map((item) => ({ ...item, isCurrent: false })), { ...current, isCurrent: true }],
    [comparisons, current]
  );

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
  const timelineRecentFirst = useMemo(() => [...timeline].reverse(), [timeline]);
  const asOfIndex = Math.max(0, timeline.findIndex((item) => item.id === asOf));
  const campaigns = timeline.slice(0, asOfIndex + 1).slice(-3);
  const curCamp = campaigns[campaigns.length - 1];
  const previous = campaigns.length > 1 ? campaigns[campaigns.length - 2] : null;
  const minN = data.segmentMinResponses ?? 5;

  const deptIndex = (index, campaign) => round1(mean(index.statements.map((statement) => valueFor(statement.byDept[deptId], campaign))));
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

  const total = deptTotal(curCamp);
  const totalDelta = previous ? round1(total - deptTotal(previous)) : null;
  const indexScores = indexes.map((index) => ({ id: index.id, name: index.name, score: deptIndex(index, curCamp) }));
  const strongest = [...indexScores].sort((left, right) => right.score - left.score)[0];
  const weakest = [...indexScores].sort((left, right) => left.score - right.score)[0];

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
        <RailSection title="Campaign">
          <div className="rs-stack">
            {timelineRecentFirst.map((campaign) => (
              <button key={campaign.id} className={`toggle-btn${asOf === campaign.id ? " active" : ""}`} onClick={() => setAsOf(campaign.id)}>
                {campaign.labelLong || campaign.label}
              </button>
            ))}
          </div>
        </RailSection>
        <RailSection title="Index Selection">
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

          <p className="slabel" style={{ marginBottom: 6 }}>Results by Segment · {current.label} favorability</p>
          <div className="coavg-note" style={{ marginBottom: 10 }}><span className="dash" /> Dotted line marks the company-wide average.</div>
          <div className="seg-grid">{segments.map((segment) => <SegmentCard key={segment.id} segment={segment} deptId={deptId} minN={minN} companyAvg={companyOverall(curCamp)} scoreColor={scoreColor} />)}</div>
        </div>
      </main>

      <aside className="rail right">
        <div className="rail-meta"><h4>How to read</h4><p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: "#3B4B63" }}>Cells are favorability points. Delta compares the selected survey to the prior survey; vs Org compares this {unitLabel.toLowerCase()} to the company average.</p></div>
        <div className="rail-insights" style={{ marginTop: 14 }}>
          <InsightCard value={strongest.score.toFixed(0)} title="Strongest Index" tone="positive">
            {strongest.name}
          </InsightCard>
          <InsightCard value={weakest.score.toFixed(0)} title="Lowest Index" tone="negative">
            {weakest.name}
          </InsightCard>
        </div>
      </aside>
    </div>
  );
}
