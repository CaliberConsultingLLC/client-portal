const SCORE_BANDS = [
  { max: 3.8, color: "#C96B60", textColor: "#FFFFFF" },
  { max: 4.6, color: "#DA8A7D", textColor: "#FFFFFF" },
  { max: 5.4, color: "#E7B0A5", textColor: "#1C252A" },
  { max: 6.2, color: "#DCD6CC", textColor: "#1C252A" },
  { max: 7.0, color: "#B8C5D4", textColor: "#1C252A" },
  { max: 7.8, color: "#8199B4", textColor: "#FFFFFF" },
  { max: Number.POSITIVE_INFINITY, color: "#5E7898", textColor: "#FFFFFF" },
] as const;

const GAP_BANDS = [
  { max: 0.5, color: "#5E7898", textColor: "#FFFFFF" },
  { max: 0.9, color: "#748DA6", textColor: "#FFFFFF" },
  { max: 1.3, color: "#97AABE", textColor: "#1C252A" },
  { max: 1.8, color: "#D7DCE2", textColor: "#1C252A" },
  { max: 2.3, color: "#E4C0B7", textColor: "#1C252A" },
  { max: 2.9, color: "#D69386", textColor: "#1C252A" },
  { max: Number.POSITIVE_INFINITY, color: "#C96B60", textColor: "#FFFFFF" },
] as const;

function getBand<T extends { max: number }>(value: number, bands: readonly T[]): T {
  return bands.find((band) => value <= band.max) ?? bands[bands.length - 1];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getScoreBandIndex(value: number, min: number, midpoint: number, max: number) {
  if (!Number.isFinite(value)) return 3;
  if (max <= min) return 3;

  const safeMidpoint = midpoint > min && midpoint < max ? midpoint : min + (max - min) / 2;
  const safeValue = clamp(value, min, max);

  if (safeValue === safeMidpoint) return 3;

  if (safeValue < safeMidpoint) {
    const lowRange = safeMidpoint - min;
    if (lowRange <= 0) return 0;
    const ratio = (safeValue - min) / lowRange;
    return Math.min(2, Math.max(0, Math.floor(ratio * 3)));
  }

  const highRange = max - safeMidpoint;
  if (highRange <= 0) return 6;
  const ratio = (safeValue - safeMidpoint) / highRange;
  return Math.min(6, Math.max(4, 3 + Math.ceil(ratio * 3)));
}

function getScoreBand(value: number, min: number, midpoint: number, max: number) {
  return SCORE_BANDS[getScoreBandIndex(value, min, midpoint, max)] ?? SCORE_BANDS[3];
}

export function scoreScaleColor(
  value: number | null,
  min: number,
  midpoint: number,
  max: number
): string {
  if (value === null || Number.isNaN(value)) {
    return "#EFE9DB";
  }
  return getScoreBand(value, min, midpoint, max).color;
}

export function scoreScaleTextColor(
  value: number | null,
  midpoint: number,
  threshold = 0.8,
  min = 3,
  max = 9
): string {
  void threshold;
  if (value === null || Number.isNaN(value)) return "#6E7E96";
  return getScoreBand(value, min, midpoint, max).textColor;
}

export const scoreScaleLegendGradient =
  "linear-gradient(to right, #C96B60 0%, #C96B60 14.285%, #DA8A7D 14.285%, #DA8A7D 28.57%, #E7B0A5 28.57%, #E7B0A5 42.855%, #DCD6CC 42.855%, #DCD6CC 57.14%, #B8C5D4 57.14%, #B8C5D4 71.425%, #8199B4 71.425%, #8199B4 85.71%, #5E7898 85.71%, #5E7898 100%)";

export function gapScaleColor(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "#EFE9DB";
  return getBand(Math.max(0, value), GAP_BANDS).color;
}

export function gapScaleTextColor(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "#6E7E96";
  return getBand(Math.max(0, value), GAP_BANDS).textColor;
}
