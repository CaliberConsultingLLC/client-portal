import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";

const config: StorybookConfig = {
  // Pick up stories anywhere under src/ — keeps them co-located with components
  stories: ["../src/**/*.stories.@(ts|tsx)"],

  addons: [
    "@storybook/addon-essentials", // Controls, Actions, Docs, Backgrounds, Viewport
    "@storybook/addon-interactions", // play() function testing
    "@storybook/addon-a11y", // Accessibility panel
  ],

  framework: {
    // @storybook/react-vite — Vite-based React stories, no Next.js webpack conflicts.
    // Tailwind v4 is picked up automatically via postcss.config.mjs.
    // "use client" directives in portal components are harmless in this context.
    name: "@storybook/react-vite",
    options: {},
  },

  // Serve public/ so components that reference /images or /icons work
  staticDirs: ["../public"],

  docs: {
    // Auto-generate a Docs page for every story tagged with autodocs
    autodocs: "tag",
  },

  // Wire up the @/* → src/* path alias that tsconfig.json defines
  async viteFinal(config) {
    const { mergeConfig } = await import("vite");
    return mergeConfig(config, {
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "../src"),
        },
      },
    });
  },
};

export default config;
