// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import { toHistoricalData } from "./ee-demo-fixture";
import {
  ClientMark,
  DateHead,
  EEReportStyles,
  BasinSurfaceStyles,
  SectionWithVerticalLabel,
  HeaderKpiPortal,
  RailSection,
  Chevron,
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

const REPORT_DATA = toHistoricalData();
const ALL = "all";
const BRAND_ORDER = [
  "AVR",
  "Larson",
  "Elite",
  "Keeney",
  "Batterby",
  "Canopy Service Group",
  "LKHS",
] as const;
const BRAND_ALIASES: Record<string, string> = {
  abr: "AVR",
  avr: "AVR",
  larson: "Larson",
  elite: "Elite",
  keeney: "Keeney",
  batterby: "Batterby",
  "canopy service group": "Canopy Service Group",
  csg: "Canopy Service Group",
  lkhs: "LKHS",
};

function textFor(color) {
  return isLightBand(color) ? "#1C252A" : "#fff";
}

function clampWords(text: string, maxWords: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(" ").trimEnd()}...`;
}

function shortStatement(text: string, maxWords = 8) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  if (points.length === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;

  let path = `M${points[0].x},${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return path;
}

function HistoryChart({
  campaigns,
  values,
  orgValues,
  backdropSeries = [],
  yDomain,
  compact = false,
}: {
  campaigns: any[];
  values: number[];
  orgValues?: number[] | null;
  backdropSeries?: Array<{ id: string; values: number[] }>;
  yDomain?: { min: number; max: number };
  compact?: boolean;
}) {
  const width = compact ? 640 : 940;
  const height = compact ? 238 : 292;
  const pad = { left: 36, right: compact ? 42 : 74, top: 18, bottom: 36 };
  const months = campaigns.map((campaign) => campaign.month);
  const maxMonth = Math.max(...months);
  const domain = [
    ...values,
    ...(orgValues ?? []),
    ...backdropSeries.flatMap((series) => series.values),
  ];
  const domainMin = Math.min(...domain);
  const domainMax = Math.max(...domain);
  const domainPad = Math.max(1.5, (domainMax - domainMin) * 0.25);
  const min = yDomain?.min ?? Math.floor(domainMin - domainPad);
  const max = yDomain?.max ?? Math.ceil(domainMax + domainPad);
  const xFor = (month) => pad.left + (month / maxMonth) * (width - pad.left - pad.right);
  const yFor = (value) => pad.top + (1 - (value - min) / (max - min)) * (height - pad.top - pad.bottom);
  const points = campaigns.map((campaign, index) => ({ x: xFor(campaign.month), y: yFor(values[index]), value: values[index] }));
  const line = buildSmoothPath(points);
  const area = `${buildSmoothPath(points)} L${points.at(-1).x},${height - pad.bottom} L${points[0].x},${height - pad.bottom} Z`;
  const orgPoints = orgValues?.map((value, index) => ({ x: xFor(campaigns[index].month), y: yFor(value), value }));
  const orgLine = orgPoints ? buildSmoothPath(orgPoints) : "";
  const backdropPaths = backdropSeries.map((series) => {
    const pts = series.values.map((value, index) => ({ x: xFor(campaigns[index].month), y: yFor(value) }));
    return { id: series.id, path: buildSmoothPath(pts) };
  });
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
      {backdropPaths.map((path, index) => (
        <path
          key={path.id}
          d={path.path}
          fill="none"
          stroke={["#A5B4C7", "#B3BFCE", "#BFC9D6", "#CDD4DE", "#D6DCE4"][index % 5]}
          strokeWidth="1.4"
          opacity=".75"
        />
      ))}
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
  selectedIndexId,
  chromeless = false,
  headerPortalId,
  basinReportSurface = false,
}: {
  data: any;
  embedded?: boolean;
  variant?: "history" | "overview";
  currentCampaignLabel?: string;
  selectedIndexId?: string;
  chromeless?: boolean;
  headerPortalId?: string;
  /** Basin group surface treatment "1b" (DWS Field redesign pilot only):
   * shared canvas tint, soft blue borders/shadows, and vertical section
   * labels — see the matching prop on `EELocationComparison`. Every other
   * caller leaves this unset and keeps the hard-edged default look. */
  basinReportSurface?: boolean;
}) {
  const { client, scale, departments, campaigns, indexes } = data;
  const exportRegistry = useVisualExportRegistry();
  const registryActive = useVisualRegistryActive();
  const registryOn = registryActive && Boolean(exportRegistry);
  // With a single campaign there is no movement to chart, so the Score Over Time
  // trend and all delta (Delta Last / Delta All) signifiers are suppressed.
  const hasComparison = campaigns.length > 1;
  const scoreColor = makeGradientColor(scale.min, scale.max);
  const [deptId, setDeptId] = useState(ALL);
  const [focus, setFocus] = useState(selectedIndexId ?? ALL);
  const isAll = deptId === ALL;
  const dept = departments.find((item) => item.id === deptId) ?? departments[0];
  const first = campaigns[0];
  const last = campaigns[campaigns.length - 1];
  const allStatements = useMemo(() => indexes.flatMap((index) => index.statements), [indexes]);
  const focusIndex = focus === ALL ? null : indexes.find((index) => index.id === focus);
  const scopeStatements = focusIndex ? focusIndex.statements : allStatements;
  const totalResponsesByCampaign = useMemo(
    () =>
      Object.fromEntries(
        campaigns.map((campaign) => [
          campaign.id,
          departments.reduce(
            (sum, item) => sum + Number(item.responsesByCampaign?.[campaign.id] ?? item.responses ?? 0),
            0
          ),
        ])
      ) as Record<string, number>,
    [campaigns, departments]
  );

  const orgStatementValue = (statement, campaignId) => {
    let num = 0;
    let den = 0;
    departments.forEach((item) => {
      const responses = Number(item.responsesByCampaign?.[campaignId] ?? item.responses ?? 0);
      if (responses <= 0) return;
      const score = statement.byDept[item.id]?.[campaignId];
      if (score == null) return;
      num += score * responses;
      den += responses;
    });
    return den > 0 ? num / den : null;
  };
  const statementValue = (statement, campaignId) => {
    if (isAll) return orgStatementValue(statement, campaignId);
    const v = statement.byDept[deptId]?.[campaignId];
    return v != null ? round1(v) : null;
  };
  const avgAt = (statements, campaignId) => {
    const vals = statements.map((s) => statementValue(s, campaignId)).filter((v) => v != null) as number[];
    return vals.length > 0 ? round1(mean(vals)) : 0;
  };
  const orgAvgAt = (statements, campaignId) => {
    const vals = statements.map((s) => orgStatementValue(s, campaignId)).filter((v) => v != null) as number[];
    return vals.length > 0 ? round1(mean(vals)) : 0;
  };

  const allIndexBackdropSeries = useMemo(
    () =>
      indexes.slice(0, 5).map((index) => ({
        id: index.id,
        values: campaigns.map((campaign) => avgAt(index.statements, campaign.id)),
      })),
    [campaigns, indexes]
  );
  const overallSeries = useMemo(
    () => campaigns.map((campaign) => avgAt(allStatements, campaign.id)),
    [allStatements, campaigns]
  );
  const series = focusIndex
    ? campaigns.map((campaign) => avgAt(focusIndex.statements, campaign.id))
    : overallSeries;
  const backdropSeries = useMemo(() => {
    return allIndexBackdropSeries
      .filter((indexSeries) => !focusIndex || indexSeries.id !== focusIndex.id)
      .map((indexSeries) => ({
        id: indexSeries.id,
        values: indexSeries.values,
      }));
  }, [allIndexBackdropSeries, focusIndex]);
  const fixedYDomain = useMemo(() => {
    const stableValues = [...overallSeries, ...allIndexBackdropSeries.flatMap((seriesItem) => seriesItem.values)];
    const stableMin = Math.min(...stableValues);
    const stableMax = Math.max(...stableValues);
    const pad = Math.max(1.5, (stableMax - stableMin) * 0.25);
    return { min: Math.floor(stableMin - pad), max: Math.ceil(stableMax + pad) };
  }, [allIndexBackdropSeries, overallSeries]);
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
  const title =
    embedded && variant === "overview"
      ? "Campaign Overview"
      : embedded && variant === "history"
        ? "Detailed History"
        : isAll
          ? "All Departments"
          : dept.name;
  const subtitle =
    embedded && variant === "overview"
      ? "Overall campaign results"
      : `${scopeLabel} · ${first.label} to ${last.label}`;
  const responseCount = isAll
    ? totalResponsesByCampaign[activeCampaign.id] ?? 0
    : Number(dept.responsesByCampaign?.[activeCampaign.id] ?? dept.responses ?? 0);
  const latestCampaign = activeCampaign;
  const indexSnapshots = useMemo(
    () =>
      indexes.map((index) => {
        const current = avgAt(index.statements, activeCampaign.id);
        const previous = previousCampaign ? avgAt(index.statements, previousCampaign.id) : null;
        return {
          id: index.id,
          name: index.name,
          current,
          delta: previous == null ? null : round1(current - previous),
        };
      }),
    [indexes, activeCampaign.id, previousCampaign?.id]
  );
  const overallInsight = useMemo(() => {
    if (indexSnapshots.length === 0) {
      return "Organization snapshot: campaign results are available, but index-level trend detail is still loading.";
    }
    const sortedByCurrent = [...indexSnapshots].sort((left, right) => right.current - left.current);
    const strongest = sortedByCurrent[0];
    const watch = sortedByCurrent[sortedByCurrent.length - 1];
    const spread = round1(strongest.current - watch.current);
    const deltas = indexSnapshots
      .map((index) => index.delta)
      .filter((value): value is number => value != null);
    const avgDelta = deltas.length > 0 ? round1(mean(deltas)) : 0;
    const positiveShare = deltas.length > 0 ? Math.round((deltas.filter((value) => value > 0).length / deltas.length) * 100) : 0;
    const totalGain = round1(currentScore - series[0]);
    const lastStep = deltaLast ?? 0;
    const responses = totalResponsesByCampaign[activeCampaign.id] ?? responseCount;
    const directionPhrase =
      avgDelta >= 1
        ? "broad upward movement"
        : avgDelta <= -0.8
          ? "broad softening"
          : "mixed movement with limited net lift";
    const consistencyPhrase =
      spread >= 6
        ? "execution consistency is the core constraint right now"
        : "index performance is comparatively tight, which gives leadership a stronger base to scale improvements";

    const hasTrend = campaigns.length > 1;
    const narrative = [
      `Campaign ${activeCampaign.label} indicates ${hasTrend ? directionPhrase + " across the organization" : "the current organization-wide readout"}, with ${responses} responses shaping this readout.`,
      `${strongest.name} remains the strongest index at ${strongest.current.toFixed(1)}, while ${watch.name} sits lowest at ${watch.current.toFixed(1)}, creating a ${spread.toFixed(1)}-point spread that signals where employee experience is not landing evenly.`,
      ...(hasTrend
        ? [
            `At an aggregate level, indexes are moving ${avgDelta >= 0 ? "up" : "down"} by ${Math.abs(avgDelta).toFixed(1)} points on average, and ${positiveShare}% of indexes improved versus the prior campaign.`,
            `The organization has moved ${totalGain >= 0 ? "up" : "down"} ${Math.abs(totalGain).toFixed(1)} points since ${first.label}, so this is not just short-term noise; it reflects a multi-cycle pattern.`,
            `The latest step change versus last campaign is ${lastStep >= 0 ? `+${lastStep.toFixed(1)}` : lastStep.toFixed(1)}, which suggests current momentum is ${Math.abs(lastStep) < 0.4 ? "plateauing" : lastStep > 0 ? "still building" : "starting to reverse"}.`,
          ]
        : []),
      `For executive action, ${consistencyPhrase}.`,
      `The near-term priority is to protect what is driving ${strongest.name} while translating those management and communication behaviors into ${watch.name}, where operational friction is most likely eroding trust and sustainability.`,
      ...(hasTrend
        ? [`If that transfer succeeds before the next cycle, the company should see a cleaner conversion of effort into organization-wide movement instead of isolated wins.`]
        : []),
    ].join(" ");
    return clampWords(narrative, 200);
  }, [indexSnapshots]);
  const brandInsights = useMemo(() => {
    const normalizeBrand = (value: string) => {
      const cleaned = String(value || "").trim().toLowerCase();
      return BRAND_ALIASES[cleaned] ?? value;
    };
    const scoreForStatement = (statement, departmentId, campaignId) => {
      const value = statement.byDept?.[departmentId]?.[campaignId];
      return typeof value === "number" ? value : null;
    };
    const weightedIndexScore = (index, deptItems, campaignId) => {
      const statementScores = index.statements
        .map((statement) => {
          let num = 0;
          let den = 0;
          deptItems.forEach((department) => {
            const value = scoreForStatement(statement, department.id, campaignId);
            const weight = Number(department.responsesByCampaign?.[campaignId] ?? department.responses ?? 0);
            if (value == null || weight <= 0) return;
            num += value * weight;
            den += weight;
          });
          return den > 0 ? num / den : null;
        })
        .filter((value): value is number => value != null);
      return statementScores.length > 0 ? round1(mean(statementScores)) : null;
    };

    const grouped = new Map<string, any[]>();
    departments.forEach((department) => {
      const source = department.location || department.name;
      const brand = normalizeBrand(source);
      if (!grouped.has(brand)) grouped.set(brand, []);
      grouped.get(brand)?.push(department);
    });

    const orderedBrands = [
      ...BRAND_ORDER.filter((brand) => grouped.has(brand)),
      ...Array.from(grouped.keys()).filter((brand) => !BRAND_ORDER.includes(brand as any)).sort((left, right) => left.localeCompare(right)),
    ];

    return orderedBrands.map((brand) => {
      const deptItems = grouped.get(brand) ?? [];

      const statementSignals = indexes
        .flatMap((index) =>
          index.statements.map((statement) => {
            const deptScores = deptItems
              .map((department) => {
                const score = statement.byDept?.[department.id]?.[activeCampaign.id];
                const weight = Number(department.responsesByCampaign?.[activeCampaign.id] ?? department.responses ?? 0);
                return typeof score === "number" && weight > 0
                  ? { department: department.name, score, weight }
                  : null;
              })
              .filter((entry): entry is { department: string; score: number; weight: number } => entry != null);
            if (deptScores.length === 0) return null;

            const currentWeighted =
              deptScores.reduce((sum, entry) => sum + entry.score * entry.weight, 0) /
              deptScores.reduce((sum, entry) => sum + entry.weight, 0);

            const previousScores =
              previousCampaign
                ? deptItems
                    .map((department) => {
                      const score = statement.byDept?.[department.id]?.[previousCampaign.id];
                      const weight = Number(department.responsesByCampaign?.[previousCampaign.id] ?? 0);
                      return typeof score === "number" && weight > 0
                        ? { score, weight }
                        : null;
                    })
                    .filter((entry): entry is { score: number; weight: number } => entry != null)
                : [];

            const previousWeighted =
              previousScores.length > 0
                ? previousScores.reduce((sum, entry) => sum + entry.score * entry.weight, 0) /
                  previousScores.reduce((sum, entry) => sum + entry.weight, 0)
                : null;

            const sortedDeptScores = [...deptScores].sort((left, right) => left.score - right.score);
            const lowestDept = sortedDeptScores[0];
            const highestDept = sortedDeptScores[sortedDeptScores.length - 1];

            return {
              indexName: index.name,
              statement: statement.text,
              current: round1(currentWeighted),
              delta: previousWeighted == null ? null : round1(currentWeighted - previousWeighted),
              spread: round1(highestDept.score - lowestDept.score),
              lowestDept: lowestDept.department,
            };
          })
        )
        .filter(
          (
            entry
          ): entry is {
            indexName: string;
            statement: string;
            current: number;
            delta: number | null;
            spread: number;
            lowestDept: string;
          } => entry != null
        );

      const lowestStatements = [...statementSignals].sort((left, right) => left.current - right.current).slice(0, 3);
      const weakest = lowestStatements[0];
      const keyAnomaly =
        [...statementSignals].sort((left, right) => right.spread - left.spread)[0] ?? weakest;
      const decliningWatch =
        [...statementSignals]
          .filter((entry) => entry.delta != null && entry.delta <= -0.8)
          .sort((left, right) => (left.delta ?? 0) - (right.delta ?? 0))[0] ?? null;
      const indexSnapshotsForBrand = indexes
        .map((index) => ({
          name: index.name,
          score: weightedIndexScore(index, deptItems, activeCampaign.id),
        }))
        .filter((entry): entry is { name: string; score: number } => entry.score != null)
        .sort((left, right) => right.score - left.score);
      const topIndex = indexSnapshotsForBrand[0];
      const bottomIndex = indexSnapshotsForBrand[indexSnapshotsForBrand.length - 1];
      const indexSpread =
        topIndex && bottomIndex
          ? round1(topIndex.score - bottomIndex.score)
          : null;

      const responseCountForBrand = deptItems.reduce(
        (sum, department) => sum + Number(department.responsesByCampaign?.[activeCampaign.id] ?? department.responses ?? 0),
        0
      );

      const actionSentence = decliningWatch
        ? `Start with "${shortStatement(decliningWatch.statement)}" first, where momentum is reversing (${f1(decliningWatch.delta ?? 0)}), then tighten leader follow-through in ${keyAnomaly.lowestDept} to stabilize delivery.`
        : `Prioritize one focused action plan around "${shortStatement(weakest?.statement ?? "")}" and require weekly leader follow-through in ${keyAnomaly.lowestDept} until consistency improves.`;
      const contextSentence =
        topIndex && bottomIndex && indexSpread != null
          ? `${brand} is not failing broadly, but execution is uneven: ${topIndex.name} outperforms ${bottomIndex.name} by ${indexSpread.toFixed(1)} points.`
          : `${brand} shows mixed performance, with clear pockets where execution is not translating into a consistent employee experience.`;
      const signalSentence = weakest
        ? `The clearest friction is "${shortStatement(weakest.statement)}" at ${weakest.current.toFixed(1)}, and the widest internal gap appears in "${shortStatement(keyAnomaly.statement)}" (${keyAnomaly.spread.toFixed(1)}-point spread).`
        : `${brand} has limited signal in the current cut, so directional interpretation should remain provisional until response depth improves.`;
      const closingSentence =
        responseCountForBrand >= 30
          ? `With ${responseCountForBrand} responses, this is actionable now and should be treated as an execution issue, not a measurement issue.`
          : `Response volume is still light (${responseCountForBrand}), so validate direction next cycle while acting on the current weak spot.`;
      const text = !weakest
        ? signalSentence
        : `${contextSentence} ${signalSentence} ${actionSentence} ${closingSentence}`;
      return {
        id: brand,
        name: brand,
        insight: clampWords(text, 100),
      };
    });
  }, [departments, indexes, activeCampaign.id, previousCampaign?.id, currentScore, first.label]);

  useEffect(() => {
    if (selectedIndexId && selectedIndexId !== focus) {
      setFocus(selectedIndexId);
    }
  }, [selectedIndexId, focus]);

  const exportFile = (section: string) =>
    buildDashboardExportFilename({ client: "dws", perspective: `${title}-${section}`, campaign: activeCampaign?.label ?? activeCampaign?.short });
  // Keep the composite export header in sync with the active perspective/filters.
  if (registryOn && exportRegistry) {
    exportRegistry.setMeta({
      title,
      filters: [isAll ? "All Departments" : dept?.name, activeCampaign?.label ?? activeCampaign?.short].filter(
        (value) => Boolean(value)
      ),
    });
  }

  return (
    <div
      className={`canvas${embedded ? " embedded" : ""}${basinReportSurface ? " basin-surface-1b" : ""}`}
      style={embedded ? { minHeight: "auto", background: basinReportSurface ? "#F4F4EF" : "#fff" } : undefined}
    >
      <EEReportStyles />
      {basinReportSurface ? <BasinSurfaceStyles /> : null}
      {!embedded ? (
      <aside className="rail left">
        <div className="client-card"><ClientMark client={client} /><div className="client-head">DETAILED HISTORY</div></div>
        <RailSection title="Department" defaultOpen>
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

      <main className="center" style={basinReportSurface ? { background: "#F4F4EF" } : undefined}>
        <div className="center-inner">
          {chromeless ? (
            <HeaderKpiPortal
              portalId={headerPortalId}
              surfaceTreatment={basinReportSurface ? "1b" : undefined}
              items={[
                { label: activeCampaign.short, value: currentScore.toFixed(1) },
                ...(hasComparison
                  ? [{ label: "Delta Last", value: deltaLast == null ? "—" : f1(deltaLast), color: deltaLast == null ? "#6E7E96" : deltaLast >= 0 ? "#9CB2A8" : "#C8B9B6" }]
                  : []),
                ...(hasComparison
                  ? [{ label: "Delta All", value: f1(deltaAll), color: deltaAll >= 0 ? "#9CB2A8" : "#C8B9B6" }]
                  : []),
                { label: "Responses", value: String(responseCount) },
              ]}
            />
          ) : (
          <div className="hero">
            <div><h2>{title}</h2><p className="hero-sub">{subtitle}</p></div>
            <div className="kpi-strip">
              <div className="kpi"><div className="k-label">{activeCampaign.short}</div><div className="k-value">{currentScore.toFixed(1)}</div></div>
              {hasComparison ? <div className="kpi"><div className="k-label">Delta Last</div><div className="k-value" style={{ color: deltaLast == null ? "#6E7E96" : deltaLast >= 0 ? "#9CB2A8" : "#C8B9B6" }}>{deltaLast == null ? "—" : f1(deltaLast)}</div></div> : null}
              {hasComparison ? <div className="kpi"><div className="k-label">Delta All</div><div className="k-value" style={{ color: deltaAll >= 0 ? "#9CB2A8" : "#C8B9B6" }}>{f1(deltaAll)}</div></div> : null}
              <div className="kpi"><div className="k-label">Responses</div><div className="k-value">{responseCount}</div></div>
            </div>
          </div>
          )}

          {variant === "overview" ? (
            <RegisteredVisualExportFrame order={5} label="Download insight" filename={exportFile("organizational-insight")}>
            <div className="card" style={{ marginBottom: basinReportSurface ? 36 : 18 }}>
              <div className="card-head"><h3 className="card-title">Organizational Insight</h3></div>
              <div className="card-body">
                <p style={{ margin: 0, color: "#3B4B63", fontSize: 13, lineHeight: 1.45 }}>{overallInsight}</p>
              </div>
            </div>
            </RegisteredVisualExportFrame>
          ) : null}


          {variant === "overview" ? (
            <div className={`grid ${basinReportSurface ? "gap-8" : "gap-4"}${hasComparison ? " xl:grid-cols-[0.95fr_1.05fr]" : ""}`} style={{ marginBottom: basinReportSurface ? 36 : 18 }}>
              <RegisteredVisualExportFrame order={10} label="Download table" filename={exportFile("statement-history")}>
              <div className="card">
                <div className="card-head"><h3 className="card-title">Statement History</h3></div>
                <div className="card-body">
                  <div className="stmt-wrap">
                    <table className="stmt-table">
                      <thead>
                        <tr>
                          <th>Index</th>
                          <th className="num col-group-end"><DateHead campaign={latestCampaign} /></th>
                          {hasComparison ? <th className="num col-group-start">Delta Last</th> : null}
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
                              {hasComparison ? <td className="cell col-group-start" style={indexDeltaLast == null ? { color: "#6E7E96" } : { background: dwsDeltaStyle(indexDeltaLast).bg, color: dwsDeltaStyle(indexDeltaLast).text }}>{indexDeltaLast == null ? "—" : f1(indexDeltaLast)}</td> : null}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              </RegisteredVisualExportFrame>
              {hasComparison ? (
              <RegisteredVisualExportFrame order={20} label="Download chart" filename={exportFile("score-over-time")}>
              <div className="card">
                <div className="card-head"><h3 className="card-title">Score Over Time</h3></div>
                <div className="card-body"><HistoryChart campaigns={campaigns} values={series} orgValues={orgSeries} backdropSeries={backdropSeries} yDomain={fixedYDomain} compact /></div>
              </div>
              </RegisteredVisualExportFrame>
              ) : null}
            </div>
          ) : hasComparison ? (
            <RegisteredVisualExportFrame order={10} label="Download chart" filename={exportFile("score-over-time")}>
            <div className="card" style={{ marginBottom: basinReportSurface ? 36 : 18 }}>
              <div className="card-head"><h3 className="card-title">Score Over Time</h3></div>
              <div className="card-body"><HistoryChart campaigns={campaigns} values={series} orgValues={orgSeries} backdropSeries={backdropSeries} yDomain={fixedYDomain} /></div>
            </div>
            </RegisteredVisualExportFrame>
          ) : null}


          {variant !== "overview" ? (
            <RegisteredVisualExportFrame order={20} label="Download table" filename={exportFile("statement-history")}>
            <SectionWithVerticalLabel label={`Statement History · ${scopeLabel}`} active={basinReportSurface}>
              {!basinReportSurface ? <p className="slabel" style={{ marginBottom: 8 }}>Statement History · {scopeLabel}</p> : null}
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
                      {hasComparison ? <th className="num col-group-start">Delta Last</th> : null}
                      {hasComparison ? <th className="num">Delta All</th> : null}
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
                            <td className="cell col-group-start" style={indexDeltaLast == null ? { color: "#6E7E96" } : { background: dwsDeltaStyle(indexDeltaLast).bg, color: dwsDeltaStyle(indexDeltaLast).text }}>{indexDeltaLast == null ? "—" : f1(indexDeltaLast)}</td>
                          </>
                        ) : (
                          <>
                            {indexValues.map((value, idx) => { const color = scoreColor(value); return <td key={campaigns[idx].id} className={`cell${idx === campaigns.length - 1 ? " col-group-end" : ""}`} style={{ background: color, color: textFor(color) }}>{value.toFixed(1)}</td>; })}
                            {hasComparison ? <td className="cell col-group-start" style={indexDeltaLast == null ? { color: "#6E7E96" } : { background: dwsDeltaStyle(indexDeltaLast).bg, color: dwsDeltaStyle(indexDeltaLast).text }}>{indexDeltaLast == null ? "—" : f1(indexDeltaLast)}</td> : null}
                            {hasComparison ? <td className="cell" style={{ background: dwsDeltaStyle(indexDeltaAll).bg, color: dwsDeltaStyle(indexDeltaAll).text }}>{f1(indexDeltaAll)}</td> : null}
                          </>
                        )}
                      </tr>
                      {open && index.statements.map((statement) => {
                        const values = campaigns.map((campaign) => statementValue(statement, campaign.id));
                        const statementLast = values[activeCampaignIndex] ?? values.at(-1);
                        const prevVal = previousCampaign ? (values[activeCampaignIndex - 1] ?? null) : null;
                        const statementDeltaLast = statementLast != null && prevVal != null ? round1(statementLast - prevVal) : null;
                        const statementDeltaAll = statementLast != null && values[0] != null ? round1(statementLast - values[0]) : null;
                        if (variant === "overview") {
                          const currentValue = values[activeCampaignIndex] ?? values.at(-1);
                          const currentColor = currentValue != null ? scoreColor(currentValue) : "#F8FAFC";
                          return <tr key={statement.id} className="stmt-row"><td className="stmt-sub">{statement.text}</td><td className="cell col-group-end" style={{ background: currentColor, color: currentValue != null ? textFor(currentColor) : "#6E7E96" }}>{currentValue != null ? currentValue.toFixed(1) : "—"}</td><td className="cell col-group-start" style={statementDeltaLast == null ? { color: "#6E7E96" } : { background: dwsDeltaStyle(statementDeltaLast).bg, color: dwsDeltaStyle(statementDeltaLast).text }}>{statementDeltaLast == null ? "—" : f1(statementDeltaLast)}</td></tr>;
                        }
                        return <tr key={statement.id} className="stmt-row"><td className="stmt-sub">{statement.text}</td>{values.map((value, idx) => { const color = value != null ? scoreColor(value) : "#F8FAFC"; return <td key={campaigns[idx].id} className={`cell${idx === campaigns.length - 1 ? " col-group-end" : ""}`} style={{ background: color, color: value != null ? textFor(color) : "#6E7E96" }}>{value != null ? value.toFixed(1) : "—"}</td>; })}{hasComparison ? <td className="cell col-group-start" style={statementDeltaLast == null ? { color: "#6E7E96" } : { background: dwsDeltaStyle(statementDeltaLast).bg, color: dwsDeltaStyle(statementDeltaLast).text }}>{statementDeltaLast == null ? "—" : f1(statementDeltaLast)}</td> : null}{hasComparison ? <td className="cell" style={statementDeltaAll == null ? { color: "#6E7E96" } : { background: dwsDeltaStyle(statementDeltaAll).bg, color: dwsDeltaStyle(statementDeltaAll).text }}>{statementDeltaAll == null ? "—" : f1(statementDeltaAll)}</td> : null}</tr>;
                      })}
                    </>
                  );
                })}
              </tbody>
                </table>
              </div>
            </SectionWithVerticalLabel>
            </RegisteredVisualExportFrame>
          ) : null}
        </div>
      </main>

      {!embedded ? (
        <aside className="rail right">
          <EEContextRail scale={scale} howToRead={hasComparison ? "Use the table and trend to compare score movement over time. Delta Last compares the latest survey to the prior survey; Delta All compares the first survey to the latest survey." : "Statement-level favorability for the current survey."} />
        </aside>
      ) : null}
    </div>
  );
}

