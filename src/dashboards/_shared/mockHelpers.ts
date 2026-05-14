/**
 * NSP Dashboard Mock Helpers
 *
 * Lightweight utilities for building realistic, deterministic mock data
 * without a backend. Components are built and iterated against these mocks,
 * then promoted to the live portal where they receive real data.
 *
 * Usage pattern:
 *   import { seed, pick, scoreFor } from "@/dashboards/_shared/mockHelpers";
 *   const score = scoreFor("respondent-42", "Culture", 7.2); // → 7.4
 */

// ─── Deterministic pseudo-random ─────────────────────────────────────────────

/**
 * Simple deterministic hash → float in [0, 1).
 * Same inputs always produce the same output — mock data is stable across
 * hot-reloads and CI runs.
 */
export function seededRandom(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
}

/** Pick a random item from an array, deterministically based on a seed string. */
export function pick<T>(items: readonly T[], seed: string): T {
  return items[Math.floor(seededRandom(seed) * items.length)];
}

/**
 * Generate a realistic survey score (0–10 scale) for a given respondent + dimension.
 * baseScore is the "true" mean; the function adds a small deterministic jitter.
 *
 * @param id       Unique string identifying the respondent + item
 * @param base     Target mean score (0–10)
 * @param spread   Max jitter in either direction (default 0.8)
 */
export function scoreFor(id: string, base: number, spread = 0.8): number {
  const jitter = (seededRandom(id) - 0.5) * 2 * spread;
  return Math.min(10, Math.max(0, Math.round((base + jitter) * 10) / 10));
}

/**
 * Generate a range of integers [start, end) as an array.
 * Useful for mapping over item IDs.
 */
export function range(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, i) => i + start);
}

// ─── Common demographic options ───────────────────────────────────────────────

export const MOCK_GENERATIONS = [
  "Baby Boomer",
  "Gen X",
  "Millennial",
  "Gen Z",
] as const;

export const MOCK_TENURES = [
  "< 1 year",
  "1–3 years",
  "3–5 years",
  "5–10 years",
  "10+ years",
] as const;

export const MOCK_RATE_TYPES = ["Hourly", "Salary"] as const;

export const MOCK_LEADERSHIP = ["No", "Yes"] as const;

// ─── Score scale constants (mirrors dashboard-implementation.tsx) ──────────────

/** The three anchor points that drive score coloring across dashboards. */
export const SCORE_SCALE = {
  min: 6,
  mid: 7.25,
  max: 8.5,
} as const;

// ─── Type helpers ─────────────────────────────────────────────────────────────

/** A minimal respondent-like shape sufficient for most story args. */
export interface MockRespondentSpec {
  department: string;
  location: string;
  fieldCategory: string;
  supervisor: string;
  baseMean: number; // target overall mean score (0–10)
}
