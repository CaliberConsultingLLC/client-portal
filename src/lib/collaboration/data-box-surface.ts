export function getDataBoxSurfaceStyle() {
  // Matches the Employee Experience KPI tile treatment: soft light panel,
  // strong border, and the standard directional EE panel shadow.
  return {
    backgroundColor: "#F5F7F8",
    borderColor: "#8798AA",
    boxShadow:
      "7px 9px 20px rgba(15,23,42,0.09), 2px 3px 6px rgba(15,23,42,0.05)",
  } as const;
}
