export const BRAND_SEGMENT_COLUMN_ALIASES = ["Company", "Brand", "Location", "Site", "Basin"] as const;
export const UNKNOWN_BRAND_LABEL = "Unknown Brand";

export function isKnownBrandSegment(value: string) {
  return Boolean(value?.trim()) && value !== UNKNOWN_BRAND_LABEL;
}
