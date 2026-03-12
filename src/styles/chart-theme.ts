/**
 * Chart theming for Recharts components.
 * Ensures all charts match the NSP design system.
 */

export const chartColors = {
  primary: [
    "#1E3A5F", // navy
    "#2F9151", // green
    "#C99A3C", // champagne
    "#5B7EA8", // steel blue
    "#EBC61E", // gold
  ],
  extended: [
    "#1E3A5F",
    "#2F9151",
    "#C99A3C",
    "#5B7EA8",
    "#EBC61E",
    "#89AACA", // light blue
    "#E8C576", // light champagne
    "#A9D6B4", // light green
  ],
  sentiment: {
    positive: "#2F9151",
    neutral: "#C99A3C",
    negative: "#D94A3A",
  },
  effort: "#1E3A5F",
  efficacy: "#2F9151",
} as const;

export const chartDefaults = {
  fontFamily: "'Montserrat', sans-serif",
  fontSize: {
    axis: 11,
    label: 12,
    title: 14,
    tooltip: 13,
  },
  fontWeight: {
    axis: 500,
    label: 600,
    title: 700,
  },
  stroke: {
    width: 2,
    dashArray: "4 4",
  },
  grid: {
    stroke: "#D9CCB3",
    strokeDasharray: "3 3",
  },
  axis: {
    primary: "#3B4B63",
    muted: "#6E7E96",
  },
  tooltip: {
    background: "#FFFCF5",
    border: "#D9CCB3",
    borderRadius: 10,
    shadow: "0 4px 12px rgba(9, 19, 31, 0.12)",
  },
  animation: {
    duration: 300,
    easing: "ease-out",
  },
} as const;

// Combined theme object for chart components
export const chartTheme = {
  colors: chartColors,
  defaults: {
    ...chartDefaults,
    gridStroke: chartDefaults.grid.stroke,
    gridStrokeDasharray: chartDefaults.grid.strokeDasharray,
    tooltipBg: chartDefaults.tooltip.background,
    tooltipBorder: chartDefaults.tooltip.border,
    tooltipShadow: chartDefaults.tooltip.shadow,
    axisPrimary: chartDefaults.axis.primary,
    axisMuted: chartDefaults.axis.muted,
    animationDuration: chartDefaults.animation.duration,
  },
} as const;
