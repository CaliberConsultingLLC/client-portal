const LOW_COLOR = { r: 221, g: 177, b: 87 };
const MID_COLOR = { r: 170, g: 194, b: 108 };
const HIGH_COLOR = { r: 47, g: 145, b: 81 };

function mixColor(
  start: { r: number; g: number; b: number },
  end: { r: number; g: number; b: number },
  progress: number
): string {
  const t = Math.min(1, Math.max(0, progress));
  const r = Math.round(start.r + (end.r - start.r) * t);
  const g = Math.round(start.g + (end.g - start.g) * t);
  const b = Math.round(start.b + (end.b - start.b) * t);
  return `rgb(${r},${g},${b})`;
}

export function scoreScaleColor(
  value: number | null,
  min: number,
  midpoint: number,
  max: number
): string {
  if (value === null || Number.isNaN(value)) {
    return "#F7F4EC";
  }

  if (value <= min) {
    return `rgb(${LOW_COLOR.r}, ${LOW_COLOR.g}, ${LOW_COLOR.b})`;
  }

  if (value >= max) {
    return `rgb(${HIGH_COLOR.r}, ${HIGH_COLOR.g}, ${HIGH_COLOR.b})`;
  }

  if (value < midpoint) {
    return mixColor(LOW_COLOR, MID_COLOR, (value - min) / (midpoint - min));
  }

  return mixColor(MID_COLOR, HIGH_COLOR, (value - midpoint) / (max - midpoint));
}

export function scoreScaleTextColor(
  value: number | null,
  midpoint: number,
  threshold = 0.8
): string {
  if (value === null) return "#6E7E96";
  return value > midpoint + threshold || value < midpoint - threshold
    ? "#FFFFFF"
    : "#152238";
}

export const scoreScaleLegendGradient =
  "linear-gradient(to right, rgb(221, 177, 87), rgb(170, 194, 108), rgb(47, 145, 81))";
