// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { toHistoricalData } from "./ee-demo-fixture";
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

const REPORT_DATA = toHistoricalData();
const ALL = "all";

function textFor(color) {
  return isLightBand(color) ? "#1C252A" : "#fff";
}

function HistoryChart({ campaigns, values, orgValues, compact = false }: { campaigns: any[]; values: number[]; orgValues?: number[] | null; compact?: boolean }) {
  const width = compact ? 640 : 940;
  const height = compact ? 238 : 292;
  const pad = { left: 36, right: compact ? 42 : 74, top: 18, bottom: 36 };
  const months = campaigns.map((campaign) => campaign.month);
  const maxMonth = Math.max(...months);
  const domain = orgValues ? [...values, ...orgValues] : values;
  const min = Math.floor((Math.min(...domain) - 2.5) / 2) * 2;
  const max = Math.ceil((Math.max(...domain) + 2.5) / 2) * 2;
  const xFor = (month) => pad.left + (month / maxMonth) * (width - pad.left - pad.right);
  const yFor = (value) => pad.top + (1 - (value - min) / (max - min)) * (height - pad.top - pad.bottom);
  const points = campaigns.map((campaign, index) => ({ x: xFor(campaign.month), y: yFor(values[index]), value: values[index] }));
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const area = `M${points[0].x},${height - pad.bottom} ${points.map((point) => `L${point.x},${point.y}`).join(" ")} L${points.at(-1).x},${height - pad.bottom} Z`;
  const orgPoints = orgValues?.map((value, index) => ({ x: xFor(campaigns[index].month), y: yFor(value), value }));
  const orgLine = orgPoints?.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const yTicks = Array.from({ length: 5 }, (_, index) => min + ((max - min) * index) / 4);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img">
      {yTicks.map((tick) => {
        const y = yFor(tick);
        return (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#D3DDE7" strokeDasharray="4 6" strokeWidth="1" opacity=".8" />
            <text x={pad.left - 10} y={y + 4} textAnchor="end" fill="#6E7E96" fontSize="10" fontWeight="700">{tick.toFixed(0)}</text>
          </g>
        );
      })}
      {points.map((point, index) => (
        <line key={campaigns[index].id} x1={point.x} x2={point.x} y1={pad.top} y2={height - pad.bottom} stroke="#E2E8EF" strokeDasharray="3 8" strokeWidth="1" />
      ))}
      <path d={area} fill="rgba(129,153,180,.22)" />
      {orgLine ? <path d={orgLine} fill="none" stroke="#1C252A" strokeDasharray="6 5" strokeWidth="1.5" opacity=".7" /> : null}
      {orgPoints?.length && !compact ? (
        <g>
          <rect x={orgPoints.at(-1).x + 10} y={orgPoints.at(-1).y - 12} width="72" height="20" rx="10" fill="#FFFFFF" stroke="#8798AA" />
          <text x={orgPoints.at(-1).x + 46} y={orgPoints.at(-1).y + 2} textAnchor="middle" fill="#1C252A" fontSize="10" fontWeight="800">Org avg</text>
        </g>
      ) : null}
      <path d={line} fill="none" stroke="#3F5F86" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => (
        <g key={campaigns[index].id}>
          <rect x={point.x - 20} y={point.y - 31} width="40" height="22" rx="6" fill="#3B4B63" />
          <text x={point.x} y={point.y - 15} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="800">{point.value.toFixed(1)}</text>
          <circle cx={point.x} cy={point.y} r="4.5" fill="#fff" stroke="#3F5F86" strokeWidth="1.875" />
          <text x={point.x} y={height - 14} textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"} fill="#3B4B63" fontSize={compact ? "11" : "12"} fontWeight="700">{campaigns[index].label}</text>
        </g>
      ))}
    </svg>
  );
}

export function EEHistoricalReport({
  data,
  embedded = false,
  variant = "history",
  currentCampaignLabel,
}: {
  data: any;
  embedded?: boolean;
  variant?: "history" | "overview";
  currentCampaignLabel?: string;
}) {
  const { client, scale, departments, campaigns, indexes } = data;
  const scoreColor = makeScoreColor(scale);
  const [deptId, setDeptId] = useState(ALL);
  const [focus, setFocus] = useState(ALL);
  const isAll = deptId === ALL;
  const dept = departments.find((item) => item.id === deptId) ?? departments[0];
  const first = campaigns[0];
  const last = campaigns[campaigns.length - 1];
  const allStatements = useMemo(() => indexes.flatMap((index) => index.statements), [indexes]);
  const focusIndex = focus === ALL ? null : indexes.find((index) => index.id === focus);
  const scopeStatements = focusIndex ? focusIndex.statements : allStatements;
  const totalResponses = departments.reduce((sum, item) => sum + item.responses, 0);

  const orgStatementValue = (statement, campaignId) => {
    let num = 0;
    let den = 0;
    departments.forEach((item) => {
      num += statement.byDept[item.id][campaignId] * item.responses;
      den += item.responses;
    });
    return num / den;
  };
  const statementValue = (statement, campaignId) => round1(isAll ? orgStatementValue(statement, campaignId) : statement.byDept[deptId][campaignId]);
  const avgAt = (statements, campaignId) => round1(mean(statements.map((statement) => statementValue(statement, campaignId))));
  const orgAvgAt = (statements, campaignId) => round1(mean(statements.map((statement) => orgStatementValue(statement, campaignId))));

  const series = campaigns.map((campaign) => avgAt(scopeStatements, campaign.id));
  const orgSeries = isAll ? null : campaigns.map((campaign) => orgAvgAt(scopeStatements, campaign.id));
  const activeCampaignIndex = Math.max(
    0,
    currentCampaignLabel
      ? campaigns.findIndex((campaign) => campaign.label === currentCampaignLabel)
      : campaigns.length - 1
  );
  const activeCampaign = campaigns[activeCampaignIndex] ?? last;
  const previousCampaign = activeCampaignIndex > 0 ? campaigns[activeCampaignIndex - 1] : null;
  const currentScore = series[activeCampaignIndex] ?? series.at(-1);
  const deltaLast = previousCampaign ? round1(currentScore - series[activeCampaignIndex - 1]) : null;
  const deltaAll = round1(currentScore - series[0]);
  const peakIndex = series.reduce((best, value, index) => value > series[best] ? index : best, 0);
  const scopeLabel = focusIndex ? `${focusIndex.name} index` : "Overall (all indexes)";
  const title = isAll ? "All Departments" : dept.name;
  const responseCount = isAll ? totalResponses : dept.responses;
  const latestCampaign = activeCampaign;

  return (
    <div className={`canvas${embedded ? " embedded" : ""}`} style={embedded ? { minHeight: "auto" } : undefined}>
      <EEReportStyles />
      {!embedded ? (
      <aside className="rail left">
        <div className="client-card"><ClientMark client={client} /><div className="client-head">DETAILED HISTORY</div></div>
        <RailSection title="Department">
          <select className="rail-select" value={deptId} onChange={(event) => setDeptId(event.target.value)}>
            <option value={ALL}>All Departments</option>
            {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <p className="rs-hint">{isAll ? `${departments.length} departments · ${totalResponses} responses` : `${dept.location} · ${dept.responses} responses`}</p>
        </RailSection>
        <RailSection title="Index Selection">
          <div className="rs-stack">
            <button className={`index-btn${focus === ALL ? " active" : ""}`} onClick={() => setFocus(ALL)}>All indexes</button>
            {indexes.map((index) => <button key={index.id} className={`index-btn${focus === index.id ? " active" : ""}`} onClick={() => setFocus(index.id)}>{index.name}</button>)}
          </div>
        </RailSection>
      </aside>
      ) : null}

      <main className="center">
        <div className="center-inner">
          <div className="hero">
            <div><h2>{title}</h2><p className="hero-sub">{scopeLabel} · {first.label} to {last.label}</p></div>
            <div className="kpi-strip">
              <div className="kpi"><div className="k-label">{activeCampaign.short}</div><div className="k-value">{currentScore.toFixed(1)}</div></div>
              <div className="kpi"><div className="k-label">Delta Last</div><div className="k-value" style={{ color: deltaLast == null ? "#6E7E96" : deltaLast >= 0 ? "#9CB2A8" : "#C8B9B6" }}>{deltaLast == null ? "—" : f1(deltaLast)}</div></div>
              <div className="kpi"><div className="k-label">Delta All</div><div className="k-value" style={{ color: deltaAll >= 0 ? "#9CB2A8" : "#C8B9B6" }}>{f1(deltaAll)}</div></div>
              <div className="kpi"><div className="k-label">Responses</div><div className="k-value">{responseCount}</div></div>
            </div>
          </div>

          {variant === "overview" ? (
            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]" style={{ marginBottom: 18 }}>
              <div className="card">
                <div className="card-head"><h3 className="card-title">Statement History</h3></div>
                <div className="card-body">
                  <div className="stmt-wrap">
                    <table className="stmt-table">
                      <thead>
                        <tr>
                          <th>Index</th>
                          <th className="num col-group-end"><DateHead campaign={latestCampaign} /></th>
                          <th className="num col-group-start">Delta Last</th>
                        </tr>
                      </thead>
                      <tbody>
                        {indexes.map((index) => {
                          const indexValues = campaigns.map((campaign) => avgAt(index.statements, campaign.id));
                          const indexLast = indexValues[activeCampaignIndex] ?? indexValues.at(-1);
                          const indexDeltaLast = previousCampaign ? round1(indexLast - indexValues[activeCampaignIndex - 1]) : null;
                          const indexColor = scoreColor(indexLast);
                          return (
                            <tr key={index.id} className="stmt-row">
                              <td className="stmt">{index.name}</td>
                              <td className="cell col-group-end" style={{ background: indexColor, color: textFor(indexColor) }}>{indexLast.toFixed(1)}</td>
                              <td className="cell col-group-start" style={indexDeltaLast == null ? { color: "#6E7E96" } : { background: deltaStyle(indexDeltaLast).bg, color: deltaStyle(indexDeltaLast).text }}>{indexDeltaLast == null ? "—" : f1(indexDeltaLast)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-head"><h3 className="card-title">Score Over Time</h3></div>
                <div className="card-body"><HistoryChart campaigns={campaigns} values={series} orgValues={orgSeries} compact /></div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="card-head"><h3 className="card-title">Score Over Time</h3></div>
              <div className="card-body"><HistoryChart campaigns={campaigns} values={series} orgValues={orgSeries} /></div>
            </div>
          )}

          {variant !== "overview" ? (
            <>
              <p className="slabel" style={{ marginBottom: 8 }}>Statement History · {scopeLabel}</p>
              <div className="stmt-wrap">
                <table className="stmt-table">
              <thead>
                <tr>
                  <th>Expand an index for statements</th>
                  {variant === "overview" ? (
                    <>
                      <th className="num col-group-end"><DateHead campaign={latestCampaign} /></th>
                      <th className="num col-group-start">Delta Last</th>
                    </>
                  ) : (
                    <>
                      {campaigns.map((campaign, campaignIndex) => <th key={campaign.id} className={`num${campaignIndex === campaigns.length - 1 ? " col-group-end" : ""}`}><DateHead campaign={campaign} /></th>)}
                      <th className="num col-group-start">Delta Last</th>
                      <th className="num">Delta All</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {indexes.map((index) => {
                  const open = focus === index.id;
                  const indexValues = campaigns.map((campaign) => avgAt(index.statements, campaign.id));
                  const indexLast = indexValues[activeCampaignIndex] ?? indexValues.at(-1);
                  const indexDeltaLast = previousCampaign ? round1(indexLast - indexValues[activeCampaignIndex - 1]) : null;
                  const indexDeltaAll = round1(indexLast - indexValues[0]);
                  return (
                    <>
                      <tr className={`acc-head${open ? " acc-open" : ""}`} onClick={() => setFocus(open ? ALL : index.id)}>
                        <td><div className="acc-name"><span className="acc-chev"><Chevron /></span><span className="acc-title">{index.name}</span></div></td>
                        {variant === "overview" ? (
                          <>
                            {(() => { const color = scoreColor(indexLast); return <td className="cell col-group-end" style={{ background: color, color: textFor(color) }}>{indexLast.toFixed(1)}</td>; })()}
                            <td className="cell col-group-start" style={indexDeltaLast == null ? { color: "#6E7E96" } : { background: deltaStyle(indexDeltaLast).bg, color: deltaStyle(indexDeltaLast).text }}>{indexDeltaLast == null ? "—" : f1(indexDeltaLast)}</td>
                          </>
                        ) : (
                          <>
                            {indexValues.map((value, idx) => { const color = scoreColor(value); return <td key={campaigns[idx].id} className={`cell${idx === campaigns.length - 1 ? " col-group-end" : ""}`} style={{ background: color, color: textFor(color) }}>{value.toFixed(1)}</td>; })}
                            <td className="cell col-group-start" style={indexDeltaLast == null ? { color: "#6E7E96" } : { background: deltaStyle(indexDeltaLast).bg, color: deltaStyle(indexDeltaLast).text }}>{indexDeltaLast == null ? "—" : f1(indexDeltaLast)}</td>
                            <td className="cell" style={{ background: deltaStyle(indexDeltaAll).bg, color: deltaStyle(indexDeltaAll).text }}>{f1(indexDeltaAll)}</td>
                          </>
                        )}
                      </tr>
                      {open && index.statements.map((statement) => {
                        const values = campaigns.map((campaign) => statementValue(statement, campaign.id));
                        const statementLast = values[activeCampaignIndex] ?? values.at(-1);
                        const statementDeltaLast = previousCampaign ? round1(statementLast - values[activeCampaignIndex - 1]) : null;
                        const statementDeltaAll = round1(statementLast - values[0]);
                        if (variant === "overview") {
                          const currentValue = values[activeCampaignIndex] ?? values.at(-1);
                          const currentColor = scoreColor(currentValue);
                          return <tr key={statement.id} className="stmt-row"><td className="stmt-sub">{statement.text}</td><td className="cell col-group-end" style={{ background: currentColor, color: textFor(currentColor) }}>{currentValue.toFixed(1)}</td><td className="cell col-group-start" style={statementDeltaLast == null ? { color: "#6E7E96" } : { background: deltaStyle(statementDeltaLast).bg, color: deltaStyle(statementDeltaLast).text }}>{statementDeltaLast == null ? "—" : f1(statementDeltaLast)}</td></tr>;
                        }
                        return <tr key={statement.id} className="stmt-row"><td className="stmt-sub">{statement.text}</td>{values.map((value, idx) => { const color = scoreColor(value); return <td key={campaigns[idx].id} className={`cell${idx === campaigns.length - 1 ? " col-group-end" : ""}`} style={{ background: color, color: textFor(color) }}>{value.toFixed(1)}</td>; })}<td className="cell col-group-start" style={statementDeltaLast == null ? { color: "#6E7E96" } : { background: deltaStyle(statementDeltaLast).bg, color: deltaStyle(statementDeltaLast).text }}>{statementDeltaLast == null ? "—" : f1(statementDeltaLast)}</td><td className="cell" style={{ background: deltaStyle(statementDeltaAll).bg, color: deltaStyle(statementDeltaAll).text }}>{f1(statementDeltaAll)}</td></tr>;
                      })}
                    </>
                  );
                })}
              </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </main>

      {!embedded ? (
        <aside className="rail right">
          <EEContextRail howToRead="Use the table and trend to compare score movement over time. Delta Last compares the latest survey to the prior survey; Delta All compares the first survey to the latest survey." />
        </aside>
      ) : null}
    </div>
  );
}
