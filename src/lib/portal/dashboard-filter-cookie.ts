/**
 * Portal design rule: remember each report's filter selections when the user
 * navigates away and returns (and across reloads in the same browser).
 *
 * Storage: cookie `ns_dash_filters_v1` when the payload fits; otherwise
 * localStorage under the same key (cookie size ~4KB).
 */

const STORE_KEY = "ns_dash_filters_v1";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days
const COOKIE_BYTE_BUDGET = 3500;

type FilterBag = Record<string, Record<string, unknown>>;

function canUseDom() {
  return typeof document !== "undefined" && typeof window !== "undefined";
}

function readCookie(name: string): string | null {
  if (!canUseDom()) return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const match = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(prefix.length));
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string) {
  if (!canUseDom()) return;
  document.cookie = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    "path=/",
    `max-age=${COOKIE_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
  ].join("; ");
}

function readStore(): FilterBag {
  if (!canUseDom()) return {};

  const fromCookie = readCookie(STORE_KEY);
  if (fromCookie) {
    try {
      const parsed = JSON.parse(fromCookie);
      if (parsed && typeof parsed === "object") return parsed as FilterBag;
    } catch {
      // fall through
    }
  }

  try {
    const fromLocal = window.localStorage.getItem(STORE_KEY);
    if (fromLocal) {
      const parsed = JSON.parse(fromLocal);
      if (parsed && typeof parsed === "object") return parsed as FilterBag;
    }
  } catch {
    // ignore
  }

  return {};
}

function writeStore(next: FilterBag) {
  if (!canUseDom()) return;
  const serialized = JSON.stringify(next);

  try {
    window.localStorage.setItem(STORE_KEY, serialized);
  } catch {
    // ignore quota errors
  }

  if (serialized.length <= COOKIE_BYTE_BUDGET) {
    writeCookie(STORE_KEY, serialized);
  }
}

export function buildDashboardFilterStoreKey(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(":");
}

export function readDashboardFilterBag(storeKey: string): Record<string, unknown> {
  if (!storeKey) return {};
  const bag = readStore()[storeKey];
  return bag && typeof bag === "object" ? { ...bag } : {};
}

export function writeDashboardFilterField(storeKey: string, field: string, value: unknown) {
  if (!storeKey || !field) return;
  const store = readStore();
  const previous = store[storeKey] && typeof store[storeKey] === "object" ? store[storeKey] : {};
  store[storeKey] = { ...previous, [field]: value };
  writeStore(store);
}

export function writeDashboardFilterBag(storeKey: string, patch: Record<string, unknown>) {
  if (!storeKey) return;
  const store = readStore();
  const previous = store[storeKey] && typeof store[storeKey] === "object" ? store[storeKey] : {};
  store[storeKey] = { ...previous, ...patch };
  writeStore(store);
}
