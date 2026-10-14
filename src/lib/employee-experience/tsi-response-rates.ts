// Static Sep 2026 response rates for TSi's Department Report, supplied by
// Caliber. Matched to the DEPT/REG value by name; any department not listed
// shows a dash.
export const TSI_DEPARTMENT_RESPONSE_RATES: Record<string, string> = {
  "Canada": "100.0%",
  "OUS": "100.0%",
  "Support - Pro Services": "100.0%",
  "FL/PR": "97.5%",
  "Support-Architect": "90.9%",
  "AM-Sales": "89.1%",
  "Western": "83.0%",
  "Sales Support": "81.8%",
  "Monitoring-Buford": "81.8%",
  "Corporate": "78.4%",
  "Support-Pro Services": "75.0%",
  "Southern": "68.4%",
  "North Central": "67.3%",
  "Support": "66.7%",
  "Eastern": "64.3%",
  "South Central": "63.6%",
  "Verizon-Managed Services": "35.3%",
  "CFA-SOC": "25.0%",
};

const normalize = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();
// Fallback key that also ignores spacing around hyphens ("Support - Architect"
// vs "Support-Architect"). Used only when it points to exactly one entry, so
// "Support - Pro Services" and "Support-Pro Services" keep their own rates.
const loose = (name: string) => normalize(name).replace(/\s*-\s*/g, "-");

const BY_NAME = new Map(
  Object.entries(TSI_DEPARTMENT_RESPONSE_RATES).map(([name, rate]) => [normalize(name), rate])
);
const BY_LOOSE_NAME = new Map<string, string | null>();
for (const [name, rate] of Object.entries(TSI_DEPARTMENT_RESPONSE_RATES)) {
  const key = loose(name);
  BY_LOOSE_NAME.set(key, BY_LOOSE_NAME.has(key) ? null : rate);
}

export function tsiDepartmentResponseRate(departmentName: string | undefined | null): string | null {
  if (!departmentName) return null;
  return BY_NAME.get(normalize(departmentName)) ?? BY_LOOSE_NAME.get(loose(departmentName)) ?? null;
}
