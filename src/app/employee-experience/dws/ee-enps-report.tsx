"use client";

import { DateHead, EEReportStyles, HeaderKpiPortal, deltaStyle, f1 } from "./ee-report-kit";
import type { EnpsGroupRow, EnpsReportProjection } from "./ee-live-projections";
import { RegisteredVisualExportFrame } from "@/components/dashboard/registered-visual-export-frame";
import { useVisualExportRegistry, useVisualRegistryActive } from "@/components/dashboard/visual-export-registry";
import { buildDashboardExportFilename } from "@/lib/dashboard/export-visual";

const ENPS_SCALE = {
  detractorMaxExclusive: 7,
  passiveMaxExclusive: 9,
  detractorColor: "#C8B9B6",
  passiveColor: "#DCE8F8",
  promoterColor: "#8EA9CC",
  darkText: "#1C252A",
  lightText: "#FFFFFF",
} as const;

function bandColor(score: number) {
  if (score < ENPS_SCALE.detractorMaxExclusive) return ENPS_SCALE.detractorColor;
  if (score < ENPS_SCALE.passiveMaxExclusive) return ENPS_SCALE.passiveColor;
  return ENPS_SCALE.promoterColor;
}

function textColor(score: number) {
  return score >= ENPS_SCALE.passiveMaxExclusive ? ENPS_SCALE.lightText : ENPS_SCALE.darkText;
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
                    <td className="cell" style={{ background: scoreBg, color: scoreFg }}>{row.score.toFixed(1)}</td>
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

export function EEEnpsReport({
  data,
  embedded = false,
  variant = "executive",
  descriptorText,
  chromeless = false,
  headerPortalId,
}: {
  data: EnpsReportProjection;
  embedded?: boolean;
  variant?: "executive" | "brand";
  descriptorText?: string;
  chromeless?: boolean;
  headerPortalId?: string;
}) {
  const exportRegistry = useVisualExportRegistry();
  const registryActive = useVisualRegistryActive();
  const registryOn = registryActive && Boolean(exportRegistry);
  const exportFile = (section: string) =>
    buildDashboardExportFilename({ client: "dws", perspective: `enps-${section}`, campaign: data.current?.label });
  if (registryOn && exportRegistry) {
    exportRegistry.setMeta({
      title: "ENPS",
      filters: [data.current?.label].filter((value): value is string => Boolean(value)),
    });
  }

  if (!data.hasEnpsData) {
    return (
      <div className={`canvas${embedded ? " embedded" : ""}`} style={embedded ? { minHeight: "auto" } : undefined}>
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
    <div className={`canvas${embedded ? " embedded" : ""}`} style={embedded ? { minHeight: "auto" } : undefined}>
      <EEReportStyles />
      <main className="center">
        <div className="center-inner">
          {chromeless ? (
            <>
              <HeaderKpiPortal
                portalId={headerPortalId}
                items={[
                  { label: "ENPS Score", value: data.summary.score.toFixed(1) },
                  {
                    label: "Delta",
                    value: data.summary.delta == null ? "—" : f1(data.summary.delta),
                    color: data.summary.delta == null ? "#6E7E96" : data.summary.delta >= 0 ? "#9CB2A8" : "#C8B9B6",
                  },
                  { label: "Responses", value: String(data.summary.responses) },
                ]}
              />
              <p className="max-w-[760px] text-[12.5px] leading-relaxed text-[#3B4B63]" style={{ marginBottom: 18 }}>
                {descriptorText ??
                  "ENPS reflects promoter minus detractor percentage points. This view uses a 10-point response interpretation: 9-10 is Goal, 7-8 is Acceptable, and 0-6 is Unacceptable."}
              </p>
            </>
          ) : (
          <div className="hero">
            <div>
              <h2>ENPS</h2>
              <p className="hero-sub">{data.current.label} results</p>
              <p className="mt-2 max-w-[760px] text-[12.5px] leading-relaxed text-[#3B4B63]">
                {descriptorText ??
                  "ENPS reflects promoter minus detractor percentage points. This view uses a 10-point response interpretation: 9-10 is Goal, 7-8 is Acceptable, and 0-6 is Unacceptable."}
              </p>
            </div>
            <div className="kpi-strip">
              <div className="kpi">
                <div className="k-label">ENPS Score</div>
                <div className="k-value">{data.summary.score.toFixed(1)}</div>
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
                <div className="k-label">Responses</div>
                <div className="k-value">{data.summary.responses}</div>
              </div>
            </div>
          </div>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            {variant === "brand" ? null : (
              <RegisteredVisualExportFrame order={10} label="Download table" filename={exportFile("brand-comparison")}>
                <EnpsTable rows={data.brandRows} title="Brand Comparison" />
              </RegisteredVisualExportFrame>
            )}
            <RegisteredVisualExportFrame order={20} label="Download table" filename={exportFile("department-comparison")}>
              <EnpsTable rows={data.departmentRows} title="Department Comparison" />
            </RegisteredVisualExportFrame>
            {variant === "brand" ? (
              <RegisteredVisualExportFrame order={30} label="Download table" filename={exportFile("supervisor-comparison")}>
                <EnpsTable rows={data.supervisorRows} title="Supervisor Comparison" />
              </RegisteredVisualExportFrame>
            ) : null}
          </div>

          <RegisteredVisualExportFrame order={40} label="Download table" filename={exportFile("trend")}>
          <div className="card" style={{ marginTop: 18, marginBottom: 18 }}>
            <div className="card-head">
              <h3 className="card-title">ENPS Trend</h3>
            </div>
            <div className="card-body">
              <div className="stmt-wrap">
                <table className="stmt-table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th className="num">ENPS Score</th>
                      <th className="num">Responses</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="stmt-row">
                      <td className="stmt"><DateHead campaign={data.current} /></td>
                      <td className="cell" style={{ background: bandColor(data.summary.score), color: textColor(data.summary.score) }}>
                        {data.summary.score.toFixed(1)}
                      </td>
                      <td className="cell">{data.summary.responses}</td>
                    </tr>
                    {data.previous ? (
                      <tr className="stmt-row">
                        <td className="stmt"><DateHead campaign={data.previous} /></td>
                        <td className="cell">{data.summary.previousScore == null ? "—" : data.summary.previousScore.toFixed(1)}</td>
                        <td className="cell">—</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          </RegisteredVisualExportFrame>
        </div>
      </main>
    </div>
  );
}

