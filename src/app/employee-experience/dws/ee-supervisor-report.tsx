// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { toSupervisorReportData } from "./ee-demo-fixture";
import {
  ClientMark,
  DateHead,
  EEReportStyles,
  RailSection,
  deltaStyle,
  f1,
  isLightBand,
  makeScoreColor,
  mean,
  round1,
} from "./ee-report-kit";
import { EEContextRail } from "./ee-context-rail";

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

function SupBarChart({ rows, axis, scoreColor }) {
  const pct = (value) => ((Math.max(axis.min, Math.min(axis.max, value)) - axis.min) / (axis.max - axis.min)) * 100;
  return (
    <div className="chart" style={{ "--label-col": "300px" }}>
      <style>{`
        .sr-track{height:24px;background:#F1F4F7;border-radius:0 7px 7px 0;position:relative}
        .sr-bar{position:absolute;left:0;top:0;bottom:0;border-radius:0 7px 7px 0}
        .sr-chip{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.95);color:#152238;border:1px solid rgba(21,34,56,.16);font-size:12px;font-weight:800;padding:3px 8px;border-radius:6px}
        .sr-org{position:absolute;top:3px;bottom:3px;width:0;border-left:2px solid rgba(21,34,56,.55);z-index:5}
        .sr-org-dot{position:absolute;top:50%;width:13px;height:13px;border-radius:999px;background:${ORG_MARKER};border:2px solid #fff;transform:translate(-50%,-50%);box-shadow:0 1px 3px rgba(0,0,0,.32);z-index:6}
        .sr-gap{position:absolute;top:50%;transform:translateY(-50%);margin-left:14px;z-index:7;font-size:11px;font-weight:800}
        .sr-org-meta{position:absolute;right:8px;top:3px;display:flex;align-items:center;gap:6px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6E7E96;z-index:8}
        .sr-org-score{font-size:12px;letter-spacing:0;color:#152238}
      `}</style>
      <div className="plot">
        <div className="grid-overlay">{axis.ticks.map((tick) => <div key={tick} className="gridline" style={{ left: `${pct(tick)}%` }} />)}</div>
        {rows.map((row) => {
          const color = scoreColor(row.value);
          const ahead = row.value >= row.org;
          return (
            <div className="bar-row" key={row.id}>
              <div className="bar-label" title={row.text} style={{ whiteSpace: "normal" }}>{row.text}</div>
              <div className="sr-track">
                <div className="sr-bar" style={{ width: `${pct(row.value)}%`, background: color }}><div className="sr-chip">{row.value.toFixed(1)}</div></div>
                <div className="sr-org" style={{ left: `${pct(row.org)}%` }} />
                <div className="sr-org-dot" style={{ left: `${pct(row.org)}%` }} />
                <div className="sr-org-meta"><span>Org Avg</span><span className="sr-org-score">{row.org.toFixed(1)}</span></div>
                <div className="sr-gap" style={{ left: `${pct(Math.max(row.value, row.org))}%`, color: ahead ? "#9CB2A8" : "#C8B9B6" }}>{f1(round1(row.value - row.org))}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="bar-row" style={{ padding: 0 }}><div /><div className="axis">{axis.ticks.map((tick) => <div key={tick} className="tick" style={{ left: `${pct(tick)}%` }}>{tick}</div>)}</div></div>
    </div>
  );
}

export function EESupervisorReport({ data }: { data: any }) {
  const { client, current, comparisons, scale, supervisors = [], index, display } = data;
  const scoreColor = makeScoreColor(scale);
  const barAxis = display?.barAxis ?? { min: 55, max: 100, ticks: [60, 70, 80, 90, 100] };
  const [supervisorId, setSupervisorId] = useState(supervisors[0]?.id ?? "");
  const [currentCampaignId, setCurrentCampaignId] = useState(() => {
    const preferredCurrent = [current, ...comparisons].find((campaign) => campaignMatches(campaign, PREFERRED_CURRENT_CAMPAIGN));
    return preferredCurrent?.id ?? current.id;
  });
  const [priorCampaignId, setPriorCampaignId] = useState(() => {
    const preferredPrior = comparisons.find((campaign) => campaignMatches(campaign, PREFERRED_PRIOR_CAMPAIGN));
    return preferredPrior?.id ?? comparisons[comparisons.length - 1]?.id ?? "";
  });
  const supervisor = supervisors.find((item) => item.id === supervisorId) ?? supervisors[0];
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
    return campaign.key === "current" ? cell.current : cell.comparisons[campaign.key];
  };
  const orgValue = (statement, campaign) => campaign.key === "current" ? statement.org.current : statement.org.comparisons[campaign.key];
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
            .sort((left, right) => right.value - left.value)
        : [],
    [hasData, index?.statements, supervisorId, curCamp]
  );

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

  const supervisorOverall = round1(mean(index.statements.map((statement) => supervisorValue(statement, curCamp))));
  const supervisorPrevious = previous ? round1(mean(index.statements.map((statement) => supervisorValue(statement, previous)))) : null;
  const orgOverall = round1(mean(index.statements.map((statement) => orgValue(statement, curCamp))));
  const overallDelta = supervisorPrevious == null ? null : round1(supervisorOverall - supervisorPrevious);
  const vsOrg = round1(supervisorOverall - orgOverall);
  return (
    <div className="canvas">
      <EEReportStyles />
      <aside className="rail left">
        <div className="client-card"><ClientMark client={client} /><div className="client-head">SUPERVISOR REPORT</div></div>
        <RailSection title="Supervisor">
          <select className="rail-select" value={supervisorId} onChange={(event) => setSupervisorId(event.target.value)}>
            {supervisors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <p className="rs-hint">{supervisor.dept} · {supervisor.responses} responses</p>
        </RailSection>
        <RailSection title="Campaign Selection">
          <div className="flex flex-col gap-3">
            <div>
              <span className="block text-center text-xs font-medium text-[#6E7E96]">Current</span>
              <select className="rail-select" value={curCamp.id} onChange={(event) => setCurrentCampaignId(event.target.value)}>
                {timeline.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.labelLong || campaign.label}</option>)}
              </select>
            </div>
            <div>
              <span className="block text-center text-xs font-medium text-[#6E7E96]">Compared To</span>
              <select className="rail-select" value={previous?.id ?? ""} onChange={(event) => setPriorCampaignId(event.target.value)}>
                {timeline.filter((campaign) => campaign.id !== curCamp.id).map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.labelLong || campaign.label}</option>)}
              </select>
            </div>
          </div>
        </RailSection>
      </aside>

      <main className="center">
        <div className="center-inner">
          <div className="hero">
            <div><h2>{supervisor.name}</h2><p className="hero-sub">{curCamp.labelLong}{previous ? ` (trend vs ${previous.label})` : ""}</p></div>
            <div className="kpi-strip">
              <div className="kpi"><div className="k-label">{index.name} Index</div><div className="k-value">{supervisorOverall.toFixed(1)}</div></div>
              <div className="kpi"><div className="k-label">vs Org</div><div className="k-value" style={{ color: vsOrg >= 0 ? "#9CB2A8" : "#C8B9B6" }}>{f1(vsOrg)}</div></div>
              <div className="kpi"><div className="k-label">Change YoY</div><div className="k-value" style={{ color: overallDelta == null ? "#6E7E96" : overallDelta >= 0 ? "#9CB2A8" : "#C8B9B6" }}>{overallDelta == null ? "—" : f1(overallDelta)}</div></div>
              <div className="kpi"><div className="k-label">Responses</div><div className="k-value">{supervisor.responses}</div></div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-head"><h3 className="card-title">Leadership Effectiveness</h3></div>
            <div className="card-body"><SupBarChart rows={barRows} axis={barAxis} scoreColor={scoreColor} /></div>
          </div>

          <p className="slabel" style={{ marginBottom: 8 }}>Statement Results · {curCamp.label}{previous ? ` vs ${previous.label}` : ""}</p>
          <div className="stmt-wrap">
            <table className="stmt-table">
              <thead><tr><th>Manager statement</th>{campaigns.map((campaign) => <th key={campaign.id} className="num"><DateHead campaign={campaign} /></th>)}<th className="num">Delta</th><th className="num">vs Org</th></tr></thead>
              <tbody>
                {barRows.map((row) => {
                  const statement = index.statements.find((item) => item.id === row.id);
                  const currentValue = supervisorValue(statement, curCamp);
                  const change = previous ? round1(currentValue - supervisorValue(statement, previous)) : null;
                  const orgGap = round1(currentValue - orgValue(statement, curCamp));
                  return (
                    <tr key={statement.id} className="stmt-row">
                      <td className="stmt">{statement.text}</td>
                      {campaigns.map((campaign) => { const value = supervisorValue(statement, campaign); const color = scoreColor(value); return <td key={campaign.id} className="cell" style={{ background: color, color: textFor(color) }}>{value.toFixed(1)}</td>; })}
                      <td className="cell" style={change == null ? { color: "#6E7E96" } : { background: deltaStyle(change).bg, color: deltaStyle(change).text }}>{change == null ? "—" : f1(change)}</td>
                      <td className="cell" style={{ background: deltaStyle(orgGap).bg, color: deltaStyle(orgGap).text }}>{f1(orgGap)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <aside className="rail right">
        <EEContextRail howToRead="Bar length and bar value show supervisor score. The vertical line and dot mark the organization average for that statement." />
      </aside>
    </div>
  );
}
