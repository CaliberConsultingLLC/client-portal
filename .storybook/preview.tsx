import type { Preview, Decorator } from "@storybook/react";
import React from "react";

// Import the portal's full design system CSS (Tailwind v4 @theme tokens, base styles)
import "../src/app/globals.css";

/**
 * NSP Theme Decorator
 *
 * Wraps every story in the portal's base layout context:
 *   - bg-surface-2 background (matches portal page canvas)
 *   - font-sans (Montserrat via CSS var)
 *   - Google Fonts link so Montserrat + Playfair Display load in the browser
 *     (next/font is stubbed in Storybook; this replaces it)
 */
const withNSPTheme: Decorator = (Story, context) => {
  const isDark = context.globals?.backgrounds?.value === "#1E3A5F";
  return (
    <>
      {/* Inject Google Fonts — mirrors what next/font does in the real app */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Playfair+Display:wght@400;500;600;700&display=swap"
      />
      <div
        className={`min-h-screen font-sans ${isDark ? "bg-nsp-blue-800" : "bg-surface-2"}`}
        style={{ fontFamily: "Montserrat, ui-sans-serif, sans-serif" }}
      >
        <Story />
      </div>
    </>
  );
};

const preview: Preview = {
  decorators: [withNSPTheme],

  parameters: {
    // Background swatches in the toolbar
    backgrounds: {
      default: "NSP Surface",
      values: [
        { name: "NSP Surface", value: "#F1F4F7" },
        { name: "White", value: "#FFFFFF" },
        { name: "NSP Navy", value: "#1E3A5F" },
      ],
    },

    // Most dashboard stories want full-page layout, not centered
    layout: "fullscreen",

    // Tell @storybook/nextjs we're using the App Router
    nextjs: {
      appDirectory: true,
    },

    // Controls panel — sort alphabetically for readability
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      sort: "alpha",
    },
  },
};

export default preview;
