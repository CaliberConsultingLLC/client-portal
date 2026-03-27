export function getDataBoxSurfaceStyle() {
  return {
    backgroundImage:
      "linear-gradient(180deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.28) 32%, rgba(61,78,101,0.1) 100%)",
    borderColor: "rgba(98, 112, 133, 0.3)",
    boxShadow:
      "0 14px 26px rgba(44, 60, 84, 0.1), inset 0 1px 0 rgba(255,255,255,0.42)",
  } as const;
}
