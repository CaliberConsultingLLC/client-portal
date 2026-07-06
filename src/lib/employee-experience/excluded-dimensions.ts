export const PLATFORM_EXCLUDED_DIMENSION_IDS = ["enps"] as const;

export function normalizeDimensionId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function isPlatformExcludedDimension(dimension: string) {
  const normalized = normalizeDimensionId(dimension);
  if ((PLATFORM_EXCLUDED_DIMENSION_IDS as readonly string[]).includes(normalized)) {
    return true;
  }

  if (normalized === "employee-nps" || normalized === "employee-net-promoter-score") {
    return true;
  }

  return /^(e-?)?nps$/i.test(dimension.trim());
}

export function mergeHiddenDimensionIds(hiddenDimensionIds: string[] = []) {
  return Array.from(
    new Set([
      ...PLATFORM_EXCLUDED_DIMENSION_IDS,
      ...hiddenDimensionIds.map(normalizeDimensionId),
    ])
  );
}

export function filterExcludedDefinitions<T extends { dimension: string }>(
  definitions: T[],
  hiddenDimensionIds: string[] = []
) {
  const hidden = new Set(mergeHiddenDimensionIds(hiddenDimensionIds));
  return definitions.filter((definition) => {
    const normalized = normalizeDimensionId(definition.dimension);
    return !hidden.has(normalized) && !isPlatformExcludedDimension(definition.dimension);
  });
}
