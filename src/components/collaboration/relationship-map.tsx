"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { DepartmentSegmentSummary } from "@/lib/collaboration/demo-insights";
import {
  gapScaleColor,
  gapScaleTextColor,
  scoreScaleColor,
  scoreScaleTextColor,
} from "@/components/collaboration/score-color-scale";
import { formatScoreForDisplay } from "@/lib/collaboration/display-format";

type MapMode = "incoming" | "outgoing" | "gap";
type MapLens = "department" | "role" | "generation" | "tenure";

interface MapNode {
  id: string;
  label: string;
  incoming: number;
  outgoing: number;
  gap: number;
  respondents?: number;
}

interface PositionedNode {
  node: MapNode;
  y: number;
}

interface RelationshipMapProps {
  selectedDepartment: string;
  incomingByDept: Array<{ department: string; score: number }>;
  outgoingByDept: Array<{ department: string; score: number }>;
  incomingCDRS: number;
  outgoingCDRS: number;
  averageGap: number;
  roleRows: DepartmentSegmentSummary[];
  generationRows: DepartmentSegmentSummary[];
  tenureRows: DepartmentSegmentSummary[];
  variant?: "cdrs" | "ci";
  ciByDept?: Array<{ department: string; score: number }>;
  centerScore?: number;
}

const CONTENT_WIDTH = 1120;
const BASE_SOURCE_NODE_WIDTH = 236;
const BASE_SOURCE_NODE_HEIGHT = 148;
const TARGET_NODE_WIDTH = 184;
const TARGET_NODE_HEIGHT = 82;
const TARGET_ROW_GAP = 22;
const MIN_RIBBON_WIDTH = 20;
const CONNECTION_RATIO = 0.5; // 50% of rectangle height at connection points
const MAX_VARIANCE_RATIO = 1.35; // width variance tops out at 35%
const SOURCE_CONNECTION_SCALE = 0.7;
const SOURCE_X = CONTENT_WIDTH / 2;
const LEFT_TARGET_X = 178;
const RIGHT_TARGET_X = 942;
const CTRL_OFFSET_X = 150;

function getNodeColor(mode: MapMode, node: MapNode): string {
  if (mode === "gap") return gapScaleColor(Math.abs(node.gap));
  return scoreScaleColor(mode === "incoming" ? node.incoming : node.outgoing, 3, 6, 9);
}

function getNodeTextColor(mode: MapMode, node: MapNode): string {
  if (mode === "gap") return gapScaleTextColor(Math.abs(node.gap));
  return scoreScaleTextColor(mode === "incoming" ? node.incoming : node.outgoing, 6);
}

function getFlowAccent(mode: MapMode, node: MapNode) {
  return {
    stroke: "rgba(255,255,255,0.22)",
    secondaryStroke: "rgba(255,255,255,0.16)",
  } as const;
}

function getNodeSurfaceStyle(
  backgroundColor: string,
  textColor: string,
  emphasis: "standard" | "selected" = "standard"
): CSSProperties {
  const isLightBand = textColor === "#1C252A";

  return {
    backgroundColor,
    backgroundImage: isLightBand
      ? "linear-gradient(180deg, rgba(255,255,255,0.54) 0%, rgba(255,255,255,0.24) 34%, rgba(61,78,101,0.09) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.06) 34%, rgba(18,27,40,0.16) 100%)",
    borderColor: isLightBand
      ? "rgba(98, 112, 133, 0.28)"
      : "rgba(255, 255, 255, 0.18)",
    boxShadow:
      emphasis === "selected"
        ? isLightBand
          ? "0 16px 30px rgba(44, 60, 84, 0.14), inset 0 1px 0 rgba(255,255,255,0.46)"
          : "0 16px 30px rgba(28, 37, 42, 0.18), inset 0 1px 0 rgba(255,255,255,0.2)"
        : isLightBand
          ? "0 10px 22px rgba(44, 60, 84, 0.1), inset 0 1px 0 rgba(255,255,255,0.4)"
          : "0 10px 22px rgba(28, 37, 42, 0.12), inset 0 1px 0 rgba(255,255,255,0.16)",
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize(vx: number, vy: number): { x: number; y: number } {
  const length = Math.sqrt(vx * vx + vy * vy) || 1;
  return { x: vx / length, y: vy / length };
}

function perpendicular(vx: number, vy: number): { x: number; y: number } {
  return { x: -vy, y: vx };
}

function splitBalancedAlphabetical(items: MapNode[]) {
  const midpoint = Math.ceil(items.length / 2);
  return {
    left: items.slice(0, midpoint),
    right: items.slice(midpoint),
  };
}

function positionColumn(nodes: MapNode[], centerY: number): PositionedNode[] {
  const totalHeight =
    nodes.length * TARGET_NODE_HEIGHT + Math.max(0, nodes.length - 1) * TARGET_ROW_GAP;
  const startY = centerY - totalHeight / 2 + TARGET_NODE_HEIGHT / 2;

  return nodes.map((node, index) => ({
    node,
    y: startY + index * (TARGET_NODE_HEIGHT + TARGET_ROW_GAP),
  }));
}

function buildFlatRibbonPath({
  startX,
  startY,
  endX,
  endY,
  startWidth,
  endWidth,
  direction,
}: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startWidth: number;
  endWidth: number;
  direction: 1 | -1;
}) {
  const cp1 = { x: startX + direction * CTRL_OFFSET_X, y: startY };
  const cp2 = { x: endX - direction * CTRL_OFFSET_X, y: endY };

  const tStart = normalize(cp1.x - startX, cp1.y - startY);
  const tEnd = normalize(endX - cp2.x, endY - cp2.y);
  const nStart = perpendicular(tStart.x, tStart.y);
  const nEnd = perpendicular(tEnd.x, tEnd.y);

  const sTop = {
    x: startX + nStart.x * (startWidth / 2),
    y: startY + nStart.y * (startWidth / 2),
  };
  const sBottom = {
    x: startX - nStart.x * (startWidth / 2),
    y: startY - nStart.y * (startWidth / 2),
  };
  const eTop = {
    x: endX + nEnd.x * (endWidth / 2),
    y: endY + nEnd.y * (endWidth / 2),
  };
  const eBottom = {
    x: endX - nEnd.x * (endWidth / 2),
    y: endY - nEnd.y * (endWidth / 2),
  };

  const cp1Top = {
    x: cp1.x + nStart.x * (startWidth / 2),
    y: cp1.y + nStart.y * (startWidth / 2),
  };
  const cp2Top = {
    x: cp2.x + nEnd.x * (endWidth / 2),
    y: cp2.y + nEnd.y * (endWidth / 2),
  };
  const cp1Bottom = {
    x: cp1.x - nStart.x * (startWidth / 2),
    y: cp1.y - nStart.y * (startWidth / 2),
  };
  const cp2Bottom = {
    x: cp2.x - nEnd.x * (endWidth / 2),
    y: cp2.y - nEnd.y * (endWidth / 2),
  };

  return [
    `M ${sTop.x} ${sTop.y}`,
    `C ${cp1Top.x} ${cp1Top.y}, ${cp2Top.x} ${cp2Top.y}, ${eTop.x} ${eTop.y}`,
    `L ${eBottom.x} ${eBottom.y}`,
    `C ${cp2Bottom.x} ${cp2Bottom.y}, ${cp1Bottom.x} ${cp1Bottom.y}, ${sBottom.x} ${sBottom.y}`,
    "Z",
  ].join(" ");
}

function buildCenterLinePath({
  startX,
  startY,
  endX,
  endY,
  direction,
}: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  direction: 1 | -1;
}) {
  const cp1 = { x: startX + direction * CTRL_OFFSET_X, y: startY };
  const cp2 = { x: endX - direction * CTRL_OFFSET_X, y: endY };
  return `M ${startX} ${startY} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${endX} ${endY}`;
}

function buildRibbonGeometry({
  startX,
  startY,
  endX,
  endY,
  direction,
}: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  direction: 1 | -1;
}) {
  return {
    start: { x: startX, y: startY },
    cp1: { x: startX + direction * CTRL_OFFSET_X, y: startY },
    cp2: { x: endX - direction * CTRL_OFFSET_X, y: endY },
    end: { x: endX, y: endY },
  };
}

function cubicPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number
) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  };
}

function cubicDerivative(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number
) {
  const mt = 1 - t;
  return {
    x:
      3 * mt * mt * (p1.x - p0.x) +
      6 * mt * t * (p2.x - p1.x) +
      3 * t * t * (p3.x - p2.x),
    y:
      3 * mt * mt * (p1.y - p0.y) +
      6 * mt * t * (p2.y - p1.y) +
      3 * t * t * (p3.y - p2.y),
  };
}

function buildRibbonSegmentPath({
  startX,
  startY,
  endX,
  endY,
  startWidth,
  endWidth,
  direction,
  tStart,
  tEnd,
  samples = 8,
}: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startWidth: number;
  endWidth: number;
  direction: 1 | -1;
  tStart: number;
  tEnd: number;
  samples?: number;
}) {
  const safeStart = clamp(Math.min(tStart, tEnd), 0, 1);
  const safeEnd = clamp(Math.max(tStart, tEnd), 0, 1);
  if (safeEnd - safeStart <= 0.001) return "";

  const geometry = buildRibbonGeometry({ startX, startY, endX, endY, direction });
  const top: Array<{ x: number; y: number }> = [];
  const bottom: Array<{ x: number; y: number }> = [];

  for (let index = 0; index <= samples; index++) {
    const t = safeStart + ((safeEnd - safeStart) * index) / samples;
    const point = cubicPoint(geometry.start, geometry.cp1, geometry.cp2, geometry.end, t);
    const tangent = cubicDerivative(
      geometry.start,
      geometry.cp1,
      geometry.cp2,
      geometry.end,
      t
    );
    const normal = perpendicular(
      normalize(tangent.x, tangent.y).x,
      normalize(tangent.x, tangent.y).y
    );
    const width = startWidth + (endWidth - startWidth) * t;

    top.push({
      x: point.x + normal.x * (width / 2),
      y: point.y + normal.y * (width / 2),
    });
    bottom.push({
      x: point.x - normal.x * (width / 2),
      y: point.y - normal.y * (width / 2),
    });
  }

  const topPath = top.slice(1).map((point) => `L ${point.x} ${point.y}`).join(" ");
  const bottomPath = bottom
    .slice()
    .reverse()
    .slice(1)
    .map((point) => `L ${point.x} ${point.y}`)
    .join(" ");
  const startTangent = normalize(
    cubicDerivative(geometry.start, geometry.cp1, geometry.cp2, geometry.end, safeStart).x,
    cubicDerivative(geometry.start, geometry.cp1, geometry.cp2, geometry.end, safeStart).y
  );
  const endTangent = normalize(
    cubicDerivative(geometry.start, geometry.cp1, geometry.cp2, geometry.end, safeEnd).x,
    cubicDerivative(geometry.start, geometry.cp1, geometry.cp2, geometry.end, safeEnd).y
  );
  const averageWidth =
    (startWidth + (endWidth - startWidth) * safeStart + startWidth + (endWidth - startWidth) * safeEnd) /
    2;
  const leadControl = {
    x: (top[top.length - 1].x + bottom[bottom.length - 1].x) / 2 + endTangent.x * averageWidth * 0.38,
    y: (top[top.length - 1].y + bottom[bottom.length - 1].y) / 2 + endTangent.y * averageWidth * 0.38,
  };
  const tailControl = {
    x: (top[0].x + bottom[0].x) / 2 + startTangent.x * averageWidth * 0.22,
    y: (top[0].y + bottom[0].y) / 2 + startTangent.y * averageWidth * 0.22,
  };

  return [
    `M ${top[0].x} ${top[0].y}`,
    topPath,
    `Q ${leadControl.x} ${leadControl.y}, ${bottom[bottom.length - 1].x} ${bottom[bottom.length - 1].y}`,
    bottomPath,
    `Q ${tailControl.x} ${tailControl.y}, ${top[0].x} ${top[0].y}`,
    "Z",
  ]
    .filter(Boolean)
    .join(" ");
}

function getWrappedSegmentRanges(start: number, length: number) {
  const normalizedStart = ((start % 1) + 1) % 1;
  const rawEnd = normalizedStart + length;

  if (rawEnd <= 1) {
    return [[normalizedStart, rawEnd]] as const;
  }

  return [
    [normalizedStart, 1],
    [0, rawEnd - 1],
  ] as const;
}

export function RelationshipMap({
  selectedDepartment,
  incomingByDept,
  outgoingByDept,
  incomingCDRS,
  outgoingCDRS,
  averageGap,
  roleRows,
  generationRows,
  tenureRows,
  variant = "cdrs",
  ciByDept = [],
  centerScore,
}: RelationshipMapProps) {
  const isCiVariant = variant === "ci";
  const [mode, setMode] = useState<MapMode>("incoming");
  const [lens, setLens] = useState<MapLens>("department");
  const [animationTime, setAnimationTime] = useState(0);
  const effectiveMode: MapMode = isCiVariant ? "incoming" : mode;

  useEffect(() => {
    if (!isCiVariant && lens !== "department" && mode !== "incoming") {
      setMode("incoming");
    }
  }, [isCiVariant, lens, mode]);

  useEffect(() => {
    let frameId = 0;

    const tick = (now: number) => {
      setAnimationTime(now);
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const nodes = useMemo(() => {
    if (lens === "department") {
      if (isCiVariant) {
        return ciByDept
          .slice()
          .sort((left, right) => left.department.localeCompare(right.department))
          .map((row) => ({
            id: `department-${row.department}`,
            label: row.department,
            incoming: row.score,
            outgoing: row.score,
            gap: 0,
          }));
      }

      // Only include departments that have valid (> 0) scores on BOTH sides.
      // A missing score on either side means not enough data — the whole
      // relationship node is suppressed rather than showing a phantom zero.
      const incomingMap = new Map(incomingByDept.filter((row) => row.score > 0).map((row) => [row.department, row.score]));
      const outgoingMap = new Map(outgoingByDept.filter((row) => row.score > 0).map((row) => [row.department, row.score]));

      return Array.from(new Set([...incomingMap.keys(), ...outgoingMap.keys()]))
        .filter((label) => label !== selectedDepartment)
        .filter((label) => incomingMap.has(label) && outgoingMap.has(label))
        .sort()
        .map((label) => {
          const incoming = incomingMap.get(label) as number;
          const outgoing = outgoingMap.get(label) as number;
          return {
            id: `department-${label}`,
            label,
            incoming,
            outgoing,
            gap: incoming - outgoing,
          } satisfies MapNode;
        });
    }

    const source =
      lens === "role"
        ? roleRows
        : lens === "generation"
          ? generationRows
          : tenureRows;

    return source
      .slice()
      .sort((left, right) => left.label.localeCompare(right.label))
      .map((row) => ({
        id: `${lens}-${row.id}`,
        label: row.label,
        incoming: isCiVariant ? row.ci : row.incomingCdrs,
        outgoing: isCiVariant ? row.ci : row.outgoingCdrs,
        gap: isCiVariant ? 0 : row.incomingCdrs - row.outgoingCdrs,
        respondents: row.respondents,
      }));
  }, [
    isCiVariant,
    lens,
    incomingByDept,
    outgoingByDept,
    ciByDept,
    selectedDepartment,
    roleRows,
    generationRows,
    tenureRows,
  ]);

  const { left, right } = splitBalancedAlphabetical(nodes);
  const ribbonConnectionWidth = Math.max(
    MIN_RIBBON_WIDTH,
    TARGET_NODE_HEIGHT * CONNECTION_RATIO
  );
  const ribbonSourceWidth = Math.max(
    MIN_RIBBON_WIDTH * SOURCE_CONNECTION_SCALE,
    (ribbonConnectionWidth / MAX_VARIANCE_RATIO) * SOURCE_CONNECTION_SCALE
  );

  const leftStackHeight = left.length * ribbonSourceWidth;
  const rightStackHeight = right.length * ribbonSourceWidth;
  const tallestColumnCount = Math.max(left.length, right.length, 1);
  const contentHeight = Math.max(
    480,
    tallestColumnCount * TARGET_NODE_HEIGHT +
      Math.max(0, tallestColumnCount - 1) * TARGET_ROW_GAP +
      110,
    260
  );
  const centerY = contentHeight / 2;

  const leftNodes = positionColumn(left, centerY);
  const rightNodes = positionColumn(right, centerY);

  const sourceNodeHeight = Math.max(
    BASE_SOURCE_NODE_HEIGHT,
    Math.max(leftStackHeight, rightStackHeight) + 32
  );
  const sourceLeftEdgeX = SOURCE_X - BASE_SOURCE_NODE_WIDTH / 2;
  const sourceRightEdgeX = SOURCE_X + BASE_SOURCE_NODE_WIDTH / 2;
  const leftStackStartY = centerY - leftStackHeight / 2 + ribbonSourceWidth / 2;
  const rightStackStartY = centerY - rightStackHeight / 2 + ribbonSourceWidth / 2;
  const leftTargetRightEdgeX = LEFT_TARGET_X + TARGET_NODE_WIDTH / 2;
  const rightTargetLeftEdgeX = RIGHT_TARGET_X - TARGET_NODE_WIDTH / 2;

  const getDisplayScore = (node: MapNode) => {
    if (isCiVariant) {
      return formatScoreForDisplay(node.incoming);
    }
    if (effectiveMode === "gap") {
      return formatScoreForDisplay(node.gap);
    }
    return formatScoreForDisplay(
      effectiveMode === "incoming" ? node.incoming : node.outgoing
    );
  };

  const getEffectiveNodeColor = (node: MapNode) => {
    if (isCiVariant) {
      return scoreScaleColor(node.incoming, 3, 6, 9);
    }
    if (effectiveMode === "gap") {
      return gapScaleColor(Math.abs(node.gap));
    }
    return scoreScaleColor(
      effectiveMode === "incoming" ? node.incoming : node.outgoing,
      3,
      6,
      9
    );
  };

  const getEffectiveNodeTextColor = (node: MapNode) => {
    if (isCiVariant) {
      return scoreScaleTextColor(node.incoming, 6);
    }
    if (effectiveMode === "gap") {
      return gapScaleTextColor(Math.abs(node.gap));
    }
    return scoreScaleTextColor(
      effectiveMode === "incoming" ? node.incoming : node.outgoing,
      6
    );
  };

  const centerDisplayScore = isCiVariant
    ? centerScore ?? incomingCDRS
    : effectiveMode === "gap"
      ? incomingCDRS - outgoingCDRS
      : effectiveMode === "incoming"
        ? incomingCDRS
        : outgoingCDRS;

  const centerBackgroundColor = isCiVariant
    ? scoreScaleColor(centerDisplayScore, 3, 6, 9)
    : effectiveMode === "gap"
      ? gapScaleColor(Math.abs(incomingCDRS - outgoingCDRS))
      : scoreScaleColor(centerDisplayScore, 3, 6, 9);

  const centerTextColor = isCiVariant
    ? scoreScaleTextColor(centerDisplayScore, 6)
    : effectiveMode === "gap"
      ? gapScaleTextColor(Math.abs(incomingCDRS - outgoingCDRS))
      : scoreScaleTextColor(centerDisplayScore, 6);

  const nodeTooltip = (node: MapNode) =>
    isCiVariant
      ? `${node.label} | CI ${formatScoreForDisplay(node.incoming)}${
          typeof node.respondents === "number" ? ` | Respondents ${node.respondents}` : ""
        }`
      : `${node.label} | Incoming ${formatScoreForDisplay(node.incoming)} | Outgoing ${formatScoreForDisplay(node.outgoing)} | Gap ${formatScoreForDisplay(node.gap)}${
          typeof node.respondents === "number" ? ` | Respondents ${node.respondents}` : ""
        }`;

  const availableModes =
    isCiVariant || lens !== "department"
      ? ([] as const)
      : (["incoming", "outgoing", "gap"] as const);
  const primaryDurationMs = 5290;
  const secondaryDurationMs = 6210;
  const primaryPhase = (animationTime % primaryDurationMs) / primaryDurationMs;
  const secondaryPhase = (animationTime % secondaryDurationMs) / secondaryDurationMs;
  const segmentLength = 0.0825;
  const segmentSpacing = 0.34;
  const segmentOffsets = [0, 1, 2];

  return (
    <div className="overflow-hidden rounded-[24px] border border-border-strong bg-white px-6 py-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {(["department", "role", "generation", "tenure"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setLens(value)}
              className={`rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                lens === value
                  ? "bg-nsp-blue-500 text-white shadow-sm"
                  : "border border-border-strong bg-white text-text-secondary hover:border-nsp-blue-200"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        {!isCiVariant && availableModes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {availableModes.map((value) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                effectiveMode === value
                  ? "bg-nsp-blue-500 text-white shadow-sm"
                  : "border border-border-strong bg-white text-text-secondary hover:border-nsp-blue-200"
              }`}
            >
              {value === "incoming" ? "Incoming" : value === "outgoing" ? "Outgoing" : "Gap"}
            </button>
          ))}
        </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <div
          className="relative mx-auto"
          style={{ width: CONTENT_WIDTH, height: contentHeight, minWidth: CONTENT_WIDTH }}
        >
          <svg width={CONTENT_WIDTH} height={contentHeight} className="absolute inset-0">
            <defs>
              <filter
                id="relationship-ribbon-shadow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="8"
                  stdDeviation="7"
                  floodColor="rgba(44, 60, 84, 0.16)"
                />
              </filter>
            </defs>
            {leftNodes.map(({ node, y }, index) => {
              const color = getEffectiveNodeColor(node);
              const flowAccent = getFlowAccent(effectiveMode, node);
              const startY = leftStackStartY + index * ribbonSourceWidth;
              const centerLine = buildCenterLinePath({
                startX: sourceLeftEdgeX,
                startY,
                endX: leftTargetRightEdgeX,
                endY: y,
                direction: -1,
              });
              const path = buildFlatRibbonPath({
                startX: sourceLeftEdgeX,
                startY,
                endX: leftTargetRightEdgeX,
                endY: y,
                startWidth: ribbonSourceWidth,
                endWidth: ribbonConnectionWidth,
                direction: -1,
              });
              const animatedPath =
                effectiveMode === "incoming"
                  ? buildCenterLinePath({
                      startX: leftTargetRightEdgeX,
                      startY: y,
                      endX: sourceLeftEdgeX,
                      endY: startY,
                      direction: 1,
                    })
                  : centerLine;

              return (
                <g key={`left-ribbon-${node.id}`}>
                  <path
                    d={path}
                    fill={color}
                    stroke="rgba(54, 69, 91, 0.16)"
                    strokeWidth="1.2"
                    filter="url(#relationship-ribbon-shadow)"
                  />
                  {effectiveMode !== "gap"
                    ? segmentOffsets.map((offset) =>
                        getWrappedSegmentRanges(
                          primaryPhase + offset * segmentSpacing,
                          segmentLength
                        ).map(([tStart, tEnd], segmentIndex) => {
                          const segmentPath = buildRibbonSegmentPath(
                            effectiveMode === "incoming"
                              ? {
                                  startX: leftTargetRightEdgeX,
                                  startY: y,
                                  endX: sourceLeftEdgeX,
                                  endY: startY,
                                  startWidth: ribbonConnectionWidth,
                                  endWidth: ribbonSourceWidth,
                                  direction: 1,
                                  tStart,
                                  tEnd,
                                }
                              : {
                                  startX: sourceLeftEdgeX,
                                  startY,
                                  endX: leftTargetRightEdgeX,
                                  endY: y,
                                  startWidth: ribbonSourceWidth,
                                  endWidth: ribbonConnectionWidth,
                                  direction: -1,
                                  tStart,
                                  tEnd,
                                }
                          );

                          if (!segmentPath) return null;

                          return (
                            <path
                              key={`left-primary-flow-${node.id}-${offset}-${segmentIndex}`}
                              d={segmentPath}
                              fill={flowAccent.stroke}
                              opacity={0.92}
                            />
                          );
                        })
                      )
                    : null}
                  {effectiveMode !== "gap" ? (
                    <path
                      d={animatedPath}
                      fill="none"
                      stroke={flowAccent.stroke}
                      strokeWidth="1.35"
                      strokeLinecap="round"
                    />
                  ) : null}
                </g>
              );
            })}

            {rightNodes.map(({ node, y }, index) => {
              const color = getEffectiveNodeColor(node);
              const flowAccent = getFlowAccent(effectiveMode, node);
              const startY = rightStackStartY + index * ribbonSourceWidth;
              const centerLine = buildCenterLinePath({
                startX: sourceRightEdgeX,
                startY,
                endX: rightTargetLeftEdgeX,
                endY: y,
                direction: 1,
              });
              const path = buildFlatRibbonPath({
                startX: sourceRightEdgeX,
                startY,
                endX: rightTargetLeftEdgeX,
                endY: y,
                startWidth: ribbonSourceWidth,
                endWidth: ribbonConnectionWidth,
                direction: 1,
              });
              const animatedPath =
                effectiveMode === "incoming"
                  ? buildCenterLinePath({
                      startX: rightTargetLeftEdgeX,
                      startY: y,
                      endX: sourceRightEdgeX,
                      endY: startY,
                      direction: -1,
                    })
                  : centerLine;

              return (
                <g key={`right-ribbon-${node.id}`}>
                  <path
                    d={path}
                    fill={color}
                    stroke="rgba(54, 69, 91, 0.16)"
                    strokeWidth="1.2"
                    filter="url(#relationship-ribbon-shadow)"
                  />
                  {effectiveMode !== "gap"
                    ? segmentOffsets.map((offset) =>
                        getWrappedSegmentRanges(
                          primaryPhase + offset * segmentSpacing,
                          segmentLength
                        ).map(([tStart, tEnd], segmentIndex) => {
                          const segmentPath = buildRibbonSegmentPath(
                            effectiveMode === "incoming"
                              ? {
                                  startX: rightTargetLeftEdgeX,
                                  startY: y,
                                  endX: sourceRightEdgeX,
                                  endY: startY,
                                  startWidth: ribbonConnectionWidth,
                                  endWidth: ribbonSourceWidth,
                                  direction: -1,
                                  tStart,
                                  tEnd,
                                }
                              : {
                                  startX: sourceRightEdgeX,
                                  startY,
                                  endX: rightTargetLeftEdgeX,
                                  endY: y,
                                  startWidth: ribbonSourceWidth,
                                  endWidth: ribbonConnectionWidth,
                                  direction: 1,
                                  tStart,
                                  tEnd,
                                }
                          );

                          if (!segmentPath) return null;

                          return (
                            <path
                              key={`right-primary-flow-${node.id}-${offset}-${segmentIndex}`}
                              d={segmentPath}
                              fill={flowAccent.stroke}
                              opacity={0.92}
                            />
                          );
                        })
                      )
                    : null}
                  {effectiveMode !== "gap" ? (
                    <path
                      d={animatedPath}
                      fill="none"
                      stroke={flowAccent.stroke}
                      strokeWidth="1.35"
                      strokeLinecap="round"
                    />
                  ) : null}
                </g>
              );
            })}
          </svg>

          <div
            className="absolute flex flex-col items-center justify-center rounded-lg border border-black/10 px-5 py-5 text-center shadow-sm"
            style={{
              left: SOURCE_X - BASE_SOURCE_NODE_WIDTH / 2,
              top: centerY - sourceNodeHeight / 2,
              width: BASE_SOURCE_NODE_WIDTH,
              height: sourceNodeHeight,
              backgroundColor: centerBackgroundColor,
              color: centerTextColor,
              ...getNodeSurfaceStyle(centerBackgroundColor, centerTextColor, "selected"),
            }}
          >
            <span
              className="w-full break-words whitespace-normal text-2xl font-bold leading-tight"
              title={selectedDepartment}
            >
              {selectedDepartment}
            </span>
            <span className="mt-4 text-3xl font-extrabold leading-none">
              {formatScoreForDisplay(centerDisplayScore)}
            </span>
          </div>

          {leftNodes.map(({ node, y }) => {
            const color = getEffectiveNodeColor(node);
            const textColor = getEffectiveNodeTextColor(node);
            return (
              <div
                key={node.id}
                className="absolute flex cursor-default flex-col items-center justify-center rounded-lg border border-black/10 px-3 text-center shadow-sm"
                style={{
                  left: LEFT_TARGET_X - TARGET_NODE_WIDTH / 2,
                  top: y - TARGET_NODE_HEIGHT / 2,
                  width: TARGET_NODE_WIDTH,
                  height: TARGET_NODE_HEIGHT,
                  color: textColor,
                  ...getNodeSurfaceStyle(color, textColor),
                }}
                title={nodeTooltip(node)}
              >
                <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold">
                  {node.label}
                </span>
                <span className="mt-1 text-lg font-bold leading-none">
                  {getDisplayScore(node)}
                </span>
              </div>
            );
          })}

          {rightNodes.map(({ node, y }) => {
            const color = getEffectiveNodeColor(node);
            const textColor = getEffectiveNodeTextColor(node);
            return (
              <div
                key={node.id}
                className="absolute flex cursor-default flex-col items-center justify-center rounded-lg border border-black/10 px-3 text-center shadow-sm"
                style={{
                  left: RIGHT_TARGET_X - TARGET_NODE_WIDTH / 2,
                  top: y - TARGET_NODE_HEIGHT / 2,
                  width: TARGET_NODE_WIDTH,
                  height: TARGET_NODE_HEIGHT,
                  color: textColor,
                  ...getNodeSurfaceStyle(color, textColor),
                }}
                title={nodeTooltip(node)}
              >
                <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold">
                  {node.label}
                </span>
                <span className="mt-1 text-lg font-bold leading-none">
                  {getDisplayScore(node)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
