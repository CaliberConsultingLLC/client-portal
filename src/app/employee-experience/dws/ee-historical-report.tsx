// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
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
  const min = yDomain?.min ?? Math.floor((Math.min(...domain) - 2.5) / 2) * 2;
  const max = yDomain?.max ?? Math.ceil((Math.max(...domain) + 2.5) / 2) * 2;
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
}: {
  data: any;
  embedded?: boolean;
  variant?: "history" | "overview";
  currentCampaignLabel?: string;
  selectedIndexId?: string;
}) {
  const { client, scale, departments, campaigns, indexes } = data;
  const scoreColor = makeScoreColor(scale);
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
      num += statement.byDept[item.id][campaignId] * responses;
      den += responses;
    });
    return den > 0 ? num / den : 0;
  };
  const statementValue = (statement, campaignId) => round1(isAll ? orgStatementValue(statement, campaignId) : statement.byDept[deptId][campaignId]);
  const avgAt = (statements, campaignId) => round1(mean(statements.map((statement) => statementValue(statement, campaignId))));
  const orgAvgAt = (statements, campaignId) => round1(mean(statements.map((statement) => orgStatementValue(statement, campaignId))));

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
    const min = Math.floor((Math.min(...stableValues) - 2.5) / 2) * 2;
    const max = Math.ceil((Math.max(...stableValues) + 2.5) / 2) * 2;
    return { min, max };
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

    const narrative = [
      `Campaign ${activeCampaign.label} indicates ${directionPhrase} across the organization, with ${responses} responses shaping this readout.`,
      `${strongest.name} remains the strongest index at ${strongest.current.toFixed(1)}, while ${watch.name} sits lowest at ${watch.current.toFixed(1)}, creating a ${spread.toFixed(1)}-point spread that signals where employee experience is not landing evenly.`,
      `At an aggregate level, indexes are moving ${avgDelta >= 0 ? "up" : "down"} by ${Math.abs(avgDelta).toFixed(1)} points on average, and ${positiveShare}% of indexes improved versus the prior campaign.`,
      `The organization has moved ${totalGain >= 0 ? "up" : "down"} ${Math.abs(totalGain).toFixed(1)} points since ${first.label}, so this is not just short-term noise; it reflects a multi-cycle pattern.`,
      `The latest step change versus last campaign is ${lastStep >= 0 ? `+${lastStep.toFixed(1)}` : lastStep.toFixed(1)}, which suggests current momentum is ${Math.abs(lastStep) < 0.4 ? "plateauing" : lastStep > 0 ? "still building" : "starting to reverse"}.`,
      `For executive action, ${consistencyPhrase}.`,
      `The near-term priority is to protect what is driving ${strongest.name} while translating those management and communication behaviors into ${watch.name}, where operational friction is most likely eroding trust and sustainability.`,
      `If that transfer succeeds before the next cycle, the company should see a cleaner conversion of effort into organization-wide movement instead of isolated wins.`,
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
            <div><h2>{title}</h2><p className="hero-sub">{subtitle}</p></div>
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
                <div className="card-body"><HistoryChart campaigns={campaigns} values={series} orgValues={orgSeries} backdropSeries={backdropSeries} yDomain={fixedYDomain} compact /></div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ marginBottom: 18 }}>
              <div className="card-head"><h3 className="card-title">Score Over Time</h3></div>
              <div className="card-body"><HistoryChart campaigns={campaigns} values={series} orgValues={orgSeries} backdropSeries={backdropSeries} yDomain={fixedYDomain} /></div>
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
