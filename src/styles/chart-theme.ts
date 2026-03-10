/**
 * Chart theming for Recharts components.
 * Ensures all charts match the NSP design system.
 */

export const chartColors = {
  primary: [
    "#3F647B", // blue
    "#E07A3F", // orange
    "#6F9A83", // green
    "#D7C97E", // yellow
    "#C88D86", // red
  ],
  extended: [
    "#3F647B",
    "#E07A3F",
    "#6F9A83",
    "#D7C97E",
    "#C88D86",
    "#6393AA", // light blue
    "#F1A06A", // light orange
    "#ABCDB9", // light green
  ],
  sentiment: {
    positive: "#6F9A83",
    neutral: "#D7C97E",
    negative: "#C88D86",
  },
  effort: "#3F647B",
  efficacy: "#E07A3F",
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
    stroke: "#E2E8F0",
    strokeDasharray: "3 3",
  },
  tooltip: {
    background: "#FFFFFF",
    border: "#E2E8F0",
    borderRadius: 10,
    shadow: "0 4px 12px rgba(15, 23, 42, 0.1)",
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
    animationDuration: chartDefaults.animation.duration,
  },
} as const;
