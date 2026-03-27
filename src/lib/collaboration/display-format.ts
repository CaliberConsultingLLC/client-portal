export function scaleScoreForDisplay(value: number) {
  return value * 10;
}

export function formatScoreForDisplay(
  value: number | null | undefined,
  decimals = 1
) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return scaleScoreForDisplay(value).toFixed(decimals);
}

export function formatScoreDeltaForDisplay(
  value: number | null | undefined,
  decimals = 1
) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return scaleScoreForDisplay(Math.abs(value)).toFixed(decimals);
}
