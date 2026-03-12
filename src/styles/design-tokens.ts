/**
 * North Star Partners Design Tokens
 *
 * Forest City-inspired palette with richer contrast and accents.
 */

export const colors = {
  // Primary brand colors
  blue: {
    DEFAULT: "#1E3A5F",
    50: "#EEF3F8",
    100: "#D7E3EF",
    200: "#B0C7DF",
    300: "#89AACA",
    400: "#5B7EA8",
    500: "#1E3A5F",
    600: "#172F4E",
    700: "#12253D",
    800: "#0D1B2C",
    900: "#09131F",
  },
  orange: {
    DEFAULT: "#C99A3C",
    50: "#FFF8EA",
    100: "#F8E9C8",
    200: "#F0D79F",
    300: "#E8C576",
    400: "#DDB157",
    500: "#C99A3C",
    600: "#A47C2F",
    700: "#7F6024",
    800: "#59431A",
    900: "#33270F",
  },

  // Accent colors
  green: {
    DEFAULT: "#2F9151",
    50: "#EDF7F0",
    100: "#D4EAD9",
    200: "#A9D6B4",
    300: "#7EC38F",
    400: "#56AD6E",
    500: "#2F9151",
    600: "#257542",
    700: "#1C5932",
    800: "#133D23",
    900: "#0B2515",
  },
  yellow: {
    DEFAULT: "#EBC61E",
    50: "#FFFCEB",
    100: "#FFF4BF",
    200: "#FDE98A",
    300: "#F8DB4F",
    400: "#EBC61E",
    500: "#C9A60E",
    600: "#A0830A",
    700: "#786207",
    800: "#504205",
    900: "#2C2502",
  },
  red: {
    DEFAULT: "#D94A3A",
    50: "#FFF1F0",
    100: "#FFDAD6",
    200: "#FFB4AB",
    300: "#FF8A7D",
    400: "#F16657",
    500: "#D94A3A",
    600: "#B63A2D",
    700: "#8E2D23",
    800: "#642019",
    900: "#3A120E",
  },

  // Neutral / Surface
  surface: {
    1: "#FFFFFF",
    2: "#F7F4EC",
    3: "#EFE9DB",
    4: "#E2D8C2",
  },
  border: {
    DEFAULT: "#D9CCB3",
    subtle: "#EDE4D3",
    strong: "#B8AA8E",
  },
  text: {
    primary: "#152238",
    secondary: "#3B4B63",
    muted: "#6E7E96",
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
