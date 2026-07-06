// Portal Kit — shared color helpers
//
// Canonical score gradient used across Caliber portal visuals: yellow → white →
// blue, mapped onto a caller-supplied [min, max] range. Keep this identical to
// the dashboard gradient so kit previews match live client visuals.

export function makeScoreColor(min: number, max: number) {
  const span = max - min || 1;
  return (value: number | null | undefined): string => {
    if (value == null || !Number.isFinite(value as number)) return "#F8FAFC";
    const t = Math.max(0, Math.min(1, ((value as number) - min) / span));
    let r: number, g: number, b: number;
    if (t <= 0.5) {
      const s = t / 0.5;
      r = Math.round(215 + (255 - 215) * s);
      g = Math.round(179 + (255 - 179) * s);
      b = Math.round(90 + (255 - 90) * s);
    } else {
      const s = (t - 0.5) / 0.5;
      r = Math.round(255 + (63 - 255) * s);
      g = Math.round(255 + (95 - 255) * s);
      b = Math.round(255 + (134 - 255) * s);
    }
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  };
}

// Pick dark vs light text for legibility over a colored band.
export function readableText(hex: string): string {
  const c = String(hex || "#ffffff").replace("#", "");
  if (c.length < 6) return "#1C252A";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1C252A" : "#fff";
}

export const KIT_BORDER = "#8798AA";
export const KIT_PANEL_SHADOW =
  "7px 9px 20px rgba(15,23,42,.09), 2px 3px 6px rgba(15,23,42,.05)";
