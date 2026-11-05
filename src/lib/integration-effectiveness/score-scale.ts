export const INTEGRATION_SCORE_SCALE = {
  minValue: 4,
  midpoint: 6,
  maxValue: 8,
  minLabel: "40",
  maxLabel: "80",
  rangeLabel: "40-80",
} as const;

/**
 * Canopy score colors. Matches the "Score Scale" legend on the dashboard:
 * gold at 40, white at the 60 midpoint, blue at 80. Values are on the internal
 * 0-10 scale (display score / 10).
 */
const SCALE_LOW = [0xd7, 0xb3, 0x5a] as const;
const SCALE_MID = [0xff, 0xff, 0xff] as const;
const SCALE_HIGH = [0x3f, 0x5f, 0x86] as const;

function mix(from: readonly number[], to: readonly number[], t: number) {
  return from.map((channel, i) => Math.round(channel + (to[i] - channel) * t));
}

export function integrationScoreRgb(value: number): [number, number, number] {
  const { minValue, midpoint, maxValue } = INTEGRATION_SCORE_SCALE;
  const clamped = Math.max(minValue, Math.min(maxValue, value));
  const rgb =
    clamped <= midpoint
      ? mix(SCALE_LOW, SCALE_MID, (clamped - minValue) / (midpoint - minValue))
      : mix(SCALE_MID, SCALE_HIGH, (clamped - midpoint) / (maxValue - midpoint));
  return rgb as [number, number, number];
}

export function integrationScoreColor(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "#EFE9DB";
  const [r, g, b] = integrationScoreRgb(value);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export function integrationScoreTextColor(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "#6E7E96";
  const [r, g, b] = integrationScoreRgb(value);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1C252A" : "#FFFFFF";
}
