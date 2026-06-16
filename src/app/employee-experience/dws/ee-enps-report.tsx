"use client";

import { DateHead, EEReportStyles, deltaStyle, f1 } from "./ee-report-kit";
import type { EnpsGroupRow, EnpsReportProjection } from "./ee-live-projections";

function bandColor(score: number) {
  if (score >= 20) return "#DCEFE2";
  if (score >= 0) return "#EEF3F8";
  if (score >= -20) return "#F3E6E5";
  return "#ECD7D6";
}

function textColor(score: number) {
  return score >= 20 ? "#2F6A45" : score >= 0 ? "#3B4B63" : "#8A3D3A";
}

function EnpsTable({ rows, title }: { rows: EnpsGroupRow[]; title: string }) {
  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">{title}</h3>
      </div>
      <div className="card-body">
        <div className="stmt-wrap">
          <table className="stmt-table">
            <thead>
              <tr>
                <th>{title}</th>
                <th className="num">ENPS</th>
                <th className="num">Delta</th>
                <th className="num">Promoters</th>
                <th className="num">Passives</th>
                <th className="num">Detractors</th>
                <th className="num">Responses</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const scoreBg = bandColor(row.score);
                const scoreFg = textColor(row.score);
                return (
                  <tr key={row.id} className="stmt-row">
                    <td className="stmt">{row.label}</td>
                    <td className="cell" style={{ background: scoreBg, color: scoreFg }}>{f1(row.score)}</td>
                    <td
                      className="cell"
                      style={
                        row.delta == null
                          ? { color: "#6E7E96" }
                          : {
                              background: deltaStyle(row.delta).bg,
                              color: deltaStyle(row.delta).text,
                            }
                      }
                    >
                      {row.delta == null ? "—" : f1(row.delta)}
                    </td>
                    <td className="cell">{row.promoterPct.toFixed(1)}%</td>
                    <td className="cell">{row.passivePct.toFixed(1)}%</td>
                    <td className="cell">{row.detractorPct.toFixed(1)}%</td>
                    <td className="cell">{row.responses}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function EEEnpsReport({ data }: { data: EnpsReportProjection }) {
  if (!data.hasEnpsData) {
    return (
      <div className="canvas">
        <EEReportStyles />
        <main className="center">
          <div className="center-inner">
            <div className="card">
              <div className="card-head">
                <h3 className="card-title">ENPS</h3>
              </div>
              <div className="card-body">
                <p style={{ color: "#6E7E96", fontSize: 14 }}>
                  ENPS data is not available in this dataset yet.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="canvas">
      <EEReportStyles />
      <main className="center">
        <div className="center-inner">
          <div className="hero">
            <div>
              <h2>ENPS</h2>
              <p className="hero-sub">
                {data.current.label}
                {data.previous ? ` (trend vs ${data.previous.label})` : ""} · {data.statementLabel}
              </p>
            </div>
            <div className="kpi-strip">
              <div className="kpi">
                <div className="k-label">ENPS</div>
                <div className="k-value">{f1(data.summary.score)}</div>
              </div>
              <div className="kpi">
                <div className="k-label">Delta</div>
                <div
                  className="k-value"
                  style={{
                    color:
                      data.summary.delta == null
                        ? "#6E7E96"
                        : data.summary.delta >= 0
                          ? "#9CB2A8"
                          : "#C8B9B6",
                  }}
                >
                  {data.summary.delta == null ? "—" : f1(data.summary.delta)}
                </div>
              </div>
              <div className="kpi">
                <div className="k-label">Promoters</div>
                <div className="k-value">{data.summary.promoterPct.toFixed(1)}%</div>
              </div>
              <div className="kpi">
                <div className="k-label">Detractors</div>
                <div className="k-value">{data.summary.detractorPct.toFixed(1)}%</div>
              </div>
              <div className="kpi">
                <div className="k-label">Responses</div>
                <div className="k-value">{data.summary.responses}</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-head">
              <h3 className="card-title">ENPS Distribution</h3>
            </div>
            <div className="card-body">
              <div className="stmt-wrap">
                <table className="stmt-table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th className="num">ENPS</th>
                      <th className="num">Promoters</th>
                      <th className="num">Passives</th>
                      <th className="num">Detractors</th>
                      <th className="num">Responses</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="stmt-row">
                      <td className="stmt"><DateHead campaign={data.current} /></td>
                      <td className="cell" style={{ background: bandColor(data.summary.score), color: textColor(data.summary.score) }}>
                        {f1(data.summary.score)}
                      </td>
                      <td className="cell">{data.summary.promoterPct.toFixed(1)}%</td>
                      <td className="cell">{data.summary.passivePct.toFixed(1)}%</td>
                      <td className="cell">{data.summary.detractorPct.toFixed(1)}%</td>
                      <td className="cell">{data.summary.responses}</td>
                    </tr>
                    {data.previous ? (
                      <tr className="stmt-row">
                        <td className="stmt"><DateHead campaign={data.previous} /></td>
                        <td className="cell">{data.summary.previousScore == null ? "—" : f1(data.summary.previousScore)}</td>
                        <td className="cell">—</td>
                        <td className="cell">—</td>
                        <td className="cell">—</td>
                        <td className="cell">—</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <EnpsTable rows={data.brandRows} title="Brand Comparison" />
            <EnpsTable rows={data.departmentRows} title="Department Comparison" />
          </div>
        </div>
      </main>
    </div>
  );
}

