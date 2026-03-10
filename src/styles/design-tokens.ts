/**
 * North Star Partners Design Tokens
 *
 * Extends the existing Compass palette (blue/orange/green)
 * with a full professional consulting brand system.
 */

export const colors = {
  // Primary brand colors
  blue: {
    DEFAULT: "#3F647B",
    50: "#F0F5F8",
    100: "#D9E5EC",
    200: "#B3CBDA",
    300: "#8DB1C7",
    400: "#6393AA",
    500: "#3F647B",
    600: "#345367",
    700: "#294253",
    800: "#1E313E",
    900: "#13202A",
  },
  orange: {
    DEFAULT: "#E07A3F",
    50: "#FEF4EE",
    100: "#FDE5D5",
    200: "#F1C4A5",
    300: "#F1A06A",
    400: "#E07A3F",
    500: "#C85A2A",
    600: "#A84520",
    700: "#83351A",
    800: "#5E2613",
    900: "#3A170C",
  },

  // Accent colors
  green: {
    DEFAULT: "#6F9A83",
    50: "#F0F6F3",
    100: "#D5E6DC",
    200: "#ABCDB9",
    300: "#6F9A83",
    400: "#5A8570",
    500: "#48705D",
    600: "#3A5B4C",
    700: "#2D463B",
    800: "#1F312A",
    900: "#121C19",
  },
  yellow: {
    DEFAULT: "#D7C97E",
    50: "#FBF9F0",
    100: "#F3EFD5",
    200: "#E8DFB0",
    300: "#D7C97E",
    400: "#C4B35E",
    500: "#A89844",
    600: "#867A37",
    700: "#655C29",
    800: "#433D1C",
    900: "#221F0E",
  },
  red: {
    DEFAULT: "#C88D86",
    50: "#FAF3F2",
    100: "#F0DDDA",
    200: "#E1BBB5",
    300: "#C88D86",
    400: "#B57069",
    500: "#9A544D",
    600: "#7C433E",
    700: "#5E3330",
    800: "#402321",
    900: "#211211",
  },

  // Neutral / Surface
  surface: {
    1: "#FFFFFF",
    2: "#F8FAFC",
    3: "#EFF3F8",
    4: "#E2E8F0",
  },
  border: {
    DEFAULT: "#E2E8F0",
    subtle: "#F1F5F9",
    strong: "#CBD5E1",
  },
  text: {
    primary: "#0F172A",
    secondary: "#475569",
    muted: "#94A3B8",
    inverse: "#FFFFFF",
  },
} as const;

export const typography = {
  fontFamily: {
    sans: "'Montserrat', 'Inter', 'Segoe UI', sans-serif",
    mono: "'Geist Mono', monospace",
  },
  fontSize: {
    xs: ["0.75rem", { lineHeight: "1rem" }],
    sm: ["0.875rem", { lineHeight: "1.25rem" }],
    base: ["1rem", { lineHeight: "1.5rem" }],
    lg: ["1.125rem", { lineHeight: "1.75rem" }],
    xl: ["1.25rem", { lineHeight: "1.75rem" }],
    "2xl": ["1.5rem", { lineHeight: "2rem" }],
    "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
    "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
    "5xl": ["3rem", { lineHeight: "1.15" }],
  },
} as const;

export const spacing = {
  card: {
    padding: "1.5rem", // 24px
    gap: "1rem",       // 16px
    radius: "0.875rem", // 14px
  },
  section: {
    padding: "4rem",    // 64px
    gap: "2rem",        // 32px
  },
} as const;

export const shadows = {
  sm: "0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.06)",
  md: "0 4px 12px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.04)",
  lg: "0 6px 20px rgba(15, 23, 42, 0.08), 0 3px 6px rgba(15, 23, 42, 0.04)",
  glass: "0 8px 32px rgba(15, 23, 42, 0.06)",
} as const;

export const motion = {
  standard: "180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  slow: "300ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  spring: "400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;
