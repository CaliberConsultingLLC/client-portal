"use client";

import { useMemo } from "react";
import { scoreScaleTextColor } from "@/components/collaboration/score-color-scale";
import { dwsScoreColor, makeGradientColor } from "./ee-report-kit";
import {
  EE_GUIDANCE_RAIL_STYLE,
  EE_PERSPECTIVE_CANVAS_STYLE,
  EE_PERSPECTIVE_MAIN_STYLE,
} from "./ee-executive-rail";
import { EEContextRail } from "./ee-context-rail";
import { GuidancePinRail } from "@/components/dashboard/guidance-pin-rail";
import { RegisteredVisualExportFrame } from "@/components/dashboard/registered-visual-export-frame";
import { useVisualExportRegistry, useVisualRegistryActive } from "@/components/dashboard/visual-export-registry";
import { buildDashboardExportFilename } from "@/lib/dashboard/export-visual";

type SupervisorRow = { id: string; name: string; dept: string; responses: number };
type StatementRow = {
  id: string;
  text: string;
  bySup: Record<string, { current: number; comparisons: Record<string, number> }>;
  org?: { current: number; comparisons: Record<string, number> };
};
type Data = {
  client: { name: string; tagline?: string; logoUrl?: string };
  current: { id: string; label: string; labelLong: string; responseRate?: number };
  scale: { min: number; mid: number; max: number };
  supervisors: SupervisorRow[];
  index: {
    id: string;
    name: string;
    statements: StatementRow[];
    score?: {
      byGroup: Record<string, { current: number | null }>;
      org: { current: number | null };
    };
  };
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function f1(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function readableText(score: number, scale: Data["scale"]) {
  return scoreScaleTextColor(score, scale.mid, 0.8, scale.min, scale.max);
}

function splitSupervisorName(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return { top: "", bottom: "" };
  if (raw.includes(",")) {
    const [last, first] = raw.split(",").map((part) => part.trim());
    return { top: last, bottom: first || "" };
  }
  const parts = raw.split(/\s+/);
  if (parts.length === 1) return { top: parts[0], bottom: "" };
  return { top: parts.at(-1) ?? raw, bottom: parts.slice(0, -1).join(" ") };
}

function SupervisorComparisonBarChart({
  rows,
  axis,
  color,
}: {
  rows: { id: string; name: string; value: number; org: number; delta: number }[];
  axis: { min: number; max: number; ticks: number[] };
  color: (value: number) => string;
}) {
  const pct = (value: number) =>
    ((Math.max(axis.min, Math.min(axis.max, value)) - axis.min) / (axis.max - axis.min)) * 100;
  return (
    <div className="chart" style={{ ["--label-col" as never]: "300px", ["--gap-col" as never]: "140px" }}>
      <style>{`
        .cmp-track{height:24px;background:#F1F4F7;border-radius:0 7px 7px 0;position:relative}
        .cmp-bar{position:absolute;left:0;top:0;bottom:0;border-radius:0 7px 7px 0;outline:1px solid rgba(0,0,0,0.18)}
        .cmp-chip{position:absolute;left:8px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.95);color:#152238;border:1px solid rgba(21,34,56,.16);font-size:12px;font-weight:800;padding:3px 8px;border-radius:6px}
        .cmp-org{position:absolute;top:2px;bottom:2px;width:0;border-left:2.5px solid rgba(21,34,56,.55);z-index:5}
        .cmp-row{display:grid;grid-template-columns:minmax(0,min(var(--label-col),50%)) minmax(0,1fr) var(--gap-col);align-items:center;column-gap:16px;min-height:34px;padding:2px 0}
        .cmp-gap-col{display:flex;align-items:center;justify-content:center;padding-left:10px}
        .cmp-gap-pill{min-width:96px;padding:4px 10px;border-radius:999px;text-align:center;font-size:13px;font-weight:900;border:1px solid}
      `}</style>
      <div className="plot">
        <div className="grid-overlay" style={{ right: "var(--gap-col)" }}>
          {axis.ticks.map((tick) => (
            <div key={tick} className="gridline" style={{ left: `${pct(tick)}%` }} />
          ))}
        </div>
        {rows.map((row) => {
          const gapTone =
            row.delta >= 0
              ? { bg: "#DCEFE2", fg: "#2F6A45", border: "#9BC6A9" }
              : { bg: "#F4DEDD", fg: "#8A3D3A", border: "#D5A3A0" };
          return (
            <div key={row.id} className="cmp-row">
              <div className="bar-label" title={row.name} style={{ whiteSpace: "normal" }}>{row.name}</div>
              <div className="cmp-track">
                <div className="cmp-bar" style={{ width: `${pct(row.value)}%`, background: color(row.value) }}>
                  <div className="cmp-chip">{row.value.toFixed(1)}</div>
                </div>
                <div className="cmp-org" style={{ left: `${pct(row.org)}%` }} />
              </div>
              <div className="cmp-gap-col">
                <div className="cmp-gap-pill" style={{ background: gapTone.bg, color: gapTone.fg, borderColor: gapTone.border }}>
                  {f1(row.delta)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EESupervisorComparison({
  data,
  dashboardInstanceId,
  canEditGuidance = false,
  executiveRail,
  benchmarkLabel = "CSG",
  chromeless = false,
  basinReportSurface = false,
}: {
  data: Data;
  dashboardInstanceId?: string;
  canEditGuidance?: boolean;
  executiveRail?: React.ReactNode;
  benchmarkLabel?: string;
  chromeless?: boolean;
  basinReportSurface?: boolean;
}) {
  const scoreColor = makeGradientColor(data.scale.min, data.scale.max);
  const supervisors = data.supervisors;
  const statements = data.index?.statements;
  const exportRegistry = useVisualExportRegistry();
  const registryActive = useVisualRegistryActive();
  const registryOn = registryActive && Boolean(exportRegistry);
  const supCmpFile = (section: string) =>
    buildDashboardExportFilename({ client: "dws", perspective: `supervisor-comparison-${section}`, campaign: data.current?.label });

  // Supervisor and org scores come from the projection's person averages. A
  // supervisor's score is the average of their people; the org line is the
  // average of everyone — not the average of the supervisor bars.
  const indexScore = data.index?.score;
  const supervisorScores = useMemo(
    () =>
      supervisors
        .map((supervisor) => {
          const value = indexScore?.byGroup?.[supervisor.id]?.current;
          return {
            id: supervisor.id,
            name: supervisor.name,
            responses: supervisor.responses,
            score: typeof value === "number" ? round1(value) : 0,
          };
        })
        .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name)),
    [supervisors, indexScore]
  );

  const orgAverage = useMemo(() => {
    const value = indexScore?.org?.current;
    return typeof value === "number" ? round1(value) : 0;
  }, [indexScore]);
  const barAxis = { min: 30, max: 90, ticks: [40, 60, 80] };

  if (supervisors.length === 0 || !statements || statements.length === 0) {
    return (
      <div
        className="block"
        style={chromeless ? { display: "block", background: basinReportSurface ? "#F4F4EF" : "#fff" } : EE_PERSPECTIVE_CANVAS_STYLE}
      >
        {executiveRail}
        <main
          className={chromeless ? "fr-persp-main flex flex-col gap-5" : "flex flex-col gap-5"}
          style={chromeless ? { ...EE_PERSPECTIVE_MAIN_STYLE, marginLeft: 0, marginRight: 0, padding: 0, background: basinReportSurface ? "#F4F4EF" : "#fff" } : EE_PERSPECTIVE_MAIN_STYLE}
        >
          <div style={{ maxWidth: 1320, margin: "0 auto", width: "100%" }}>
            <div className="rounded-2xl border border-[#8798AA] bg-white px-6 py-10 text-sm text-[#6E7E96]">
              No supervisor comparison data is available for this campaign and filter selection yet.
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (registryOn && exportRegistry) {
    exportRegistry.setMeta({
      title: "Supervisor Comparison",
      filters: [data.current?.labelLong || data.current?.label].filter((value): value is string => Boolean(value)),
    });
  }

  return (
    <div
      className="block"
      style={chromeless ? { display: "block", background: basinReportSurface ? "#F4F4EF" : "#fff" } : EE_PERSPECTIVE_CANVAS_STYLE}
    >
      {executiveRail}

      <main
        className={chromeless ? "fr-persp-main flex flex-col gap-5" : "flex flex-col gap-5"}
        style={chromeless ? { ...EE_PERSPECTIVE_MAIN_STYLE, marginLeft: 0, marginRight: 0, padding: 0, background: basinReportSurface ? "#F4F4EF" : "#fff" } : EE_PERSPECTIVE_MAIN_STYLE}
      >
        <div style={{ maxWidth: 1320, margin: "0 auto", width: "100%" }} className="flex flex-col gap-5">
          <div
            className="rounded-2xl p-5"
            style={{
              border: "1px solid #8798AA",
              background: "linear-gradient(135deg,#fff 0%,#F1F4F7 55%,rgba(238,243,248,.5) 100%)",
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="mt-1 font-extrabold" style={{ fontSize: 27, letterSpacing: "-0.02em", color: "#152238" }}>
                  Supervisor Comparison
                </h2>
                <p className="mt-0.5 font-semibold" style={{ fontSize: 14, color: "#3B4B63" }}>
                  {data.current.labelLong} · {data.index.name} index only
                </p>
              </div>
              <div className="flex shrink-0 gap-3">
                <div
                  className="flex min-h-[76px] min-w-[104px] flex-col items-center justify-center gap-1 rounded-2xl px-4 py-2"
                  style={{ border: "1px solid #8798AA", background: "rgba(255,255,255,.85)" }}
                >
                  <div className="font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "#6E7E96" }}>
                    Supervisor Avg
                  </div>
                  <div className="font-extrabold" style={{ fontSize: 25, color: "#152238" }}>{orgAverage.toFixed(1)}</div>
                </div>
              </div>
            </div>
          </div>

          <RegisteredVisualExportFrame order={10} label="Download chart" filename={supCmpFile("current-chart")}>
          <div
            style={{
              border: "1px solid #8798AA",
              borderRadius: 16,
              boxShadow: "7px 9px 20px rgba(15,23,42,.09), 2px 3px 6px rgba(15,23,42,.05)",
              overflow: "hidden",
            }}
          >
            <div className="px-6 py-4 flex items-center justify-between gap-4" style={{ borderBottom: "1px solid #E2E8EF" }}>
              <h3 className="font-bold" style={{ fontSize: 15, color: "#152238" }}>Current Campaign</h3>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6E7E96]">Comparison to {benchmarkLabel}</span>
            </div>
            <div className="px-6 py-5">
              <SupervisorComparisonBarChart
                rows={supervisorScores.map((row) => ({
                  id: row.id,
                  name: row.name,
                  value: row.score,
                  org: orgAverage,
                  delta: round1(row.score - orgAverage),
                }))}
                axis={barAxis}
                color={scoreColor}
              />
            </div>
          </div>
          </RegisteredVisualExportFrame>

          <RegisteredVisualExportFrame order={20} label="Download heat map" filename={supCmpFile("statement-heatmap")}>
          <div
            style={{
              border: "1px solid #8798AA",
              borderRadius: 16,
              boxShadow: "7px 9px 20px rgba(15,23,42,.09), 2px 3px 6px rgba(15,23,42,.05)",
              overflow: "hidden",
            }}
          >
            <div className="px-6 py-4" style={{ borderBottom: "1px solid #E2E8EF" }}>
              <h3 className="font-bold" style={{ fontSize: 15, color: "#152238" }}>{data.index.name} Statement Heat Map</h3>
              <p className="mt-1 text-[12px]" style={{ color: "#6E7E96" }}>
                Rows are {data.index.name} statements and columns are supervisors for the selected campaign.
              </p>
            </div>
            <div className="px-6 py-5">
              {(() => {
                const longestLabel = Math.max(
                  "Avg".length,
                  ...supervisorScores.map((row) => row.name.length)
                );
                const manyColumns = supervisorScores.length > 6;
                const dataColPx = manyColumns
                  ? 48
                  : Math.min(92, Math.max(64, longestLabel * 6.5 + 20));
                const statementColPx = manyColumns ? 220 : 560;
                const verticalHeaderHeight = Math.min(
                  150,
                  Math.max(88, Math.ceil(longestLabel / 2) * 6.2 + 34)
                );
                const VerticalLabel = ({ text, ink = "#3B4B63" }: { text: string; ink?: string }) => (
                  <div
                    style={{
                      height: verticalHeaderHeight - 20,
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        whiteSpace: "normal",
                        overflowWrap: "break-word",
                        wordBreak: "break-word",
                        height: "100%",
                        maxWidth: dataColPx - 6,
                        textAlign: "center",
                        fontWeight: 700,
                        fontSize: 10,
                        letterSpacing: "0.01em",
                        color: ink,
                        lineHeight: 1.12,
                      }}
                    >
                      {text}
                    </span>
                  </div>
                );
                return (
              <div style={{ overflowX: manyColumns ? "visible" : "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: manyColumns ? undefined : 1180,
                    fontSize: manyColumns ? 12 : 12.5,
                    tableLayout: "fixed",
                  }}
                >
                  <colgroup>
                    <col style={{ width: statementColPx }} />
                    {supervisorScores.map((row) => (
                      <col key={`col-${row.id}`} style={{ width: dataColPx }} />
                    ))}
                    <col style={{ width: dataColPx }} />
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
                          verticalAlign: manyColumns ? "bottom" : "middle",
                        }}
                      >
                        {data.index.name} Statement
                      </th>
                      {supervisorScores.map((row) =>
                        manyColumns ? (
                          <th
                            key={row.id}
                            style={{
                              background: "#E2E8EF",
                              textAlign: "center",
                              padding: "10px 0 12px",
                              border: "1px solid #D3DDE7",
                              height: verticalHeaderHeight,
                              verticalAlign: "bottom",
                            }}
                          >
                            <VerticalLabel text={row.name} />
                          </th>
                        ) : (
                          <th
                            key={row.id}
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
                            {(() => {
                              const split = splitSupervisorName(row.name);
                              return (
                                <span className="block">
                                  <span className="block">{split.top}</span>
                                  <span className="block">{split.bottom}</span>
                                </span>
                              );
                            })()}
                          </th>
                        )
                      )}
                      {manyColumns ? (
                        <th
                          style={{
                            background: "#E2E8EF",
                            textAlign: "center",
                            padding: "10px 0 12px",
                            border: "1px solid #8798AA",
                            height: verticalHeaderHeight,
                            verticalAlign: "bottom",
                          }}
                        >
                          <VerticalLabel text="Avg" ink="#152238" />
                        </th>
                      ) : (
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
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {statements.map((statement) => {
                      // Row average is this statement's org-wide person average.
                      const statementAvg =
                        typeof statement.org?.current === "number" ? round1(statement.org.current) : 0;
                      const avgColor = scoreColor(statementAvg);
                      return (
                        <tr key={statement.id}>
                          <td
                            style={{
                              border: "1px solid #D3DDE7",
                              padding: "9px 12px",
                              color: "#152238",
                              lineHeight: 1.2,
                              fontWeight: 500,
                              whiteSpace: manyColumns ? "normal" : "nowrap",
                            }}
                          >
                            {statement.text}
                          </td>
                          {supervisorScores.map((row) => {
                            const value = statement.bySup[row.id]?.current ?? 0;
                            const color = scoreColor(value);
                            return (
                              <td
                                key={`${statement.id}-${row.id}`}
                                style={{
                                  border: "1px solid #D3DDE7",
                                  textAlign: "center",
                                  padding: manyColumns ? "6px 4px" : "8px",
                                  background: color,
                                  color: readableText(value, data.scale),
                                  fontWeight: 800,
                                  fontSize: manyColumns ? 12 : undefined,
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
                              padding: manyColumns ? "6px 4px" : "8px",
                              background: avgColor,
                              color: readableText(statementAvg, data.scale),
                              fontWeight: 900,
                              fontSize: manyColumns ? 12 : undefined,
                            }}
                          >
                            {statementAvg.toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
                );
              })()}
            </div>
          </div>
          </RegisteredVisualExportFrame>
        </div>
      </main>

      {!chromeless ? (
      <aside className="hidden xl:flex xl:flex-col xl:gap-4 xl:p-6" style={EE_GUIDANCE_RAIL_STYLE}>
        <EEContextRail scale={data.scale} howToRead={`${data.index.name}-only view: top bars show each supervisor's current average and the heat map shows statement-level current scores for each supervisor.`} />
        {dashboardInstanceId ? (
          <GuidancePinRail
            dashboardInstanceId={dashboardInstanceId}
            perspectiveId="ee-supervisor-comparison"
            campaignLabel={data.current.label}
            filterKey={`${data.current.id}|${supervisors.length}`}
            canEdit={canEditGuidance}
          />
        ) : null}
      </aside>
      ) : null}
    </div>
  );
}


