import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  // Pick up stories anywhere under src/ — keeps them co-located with components
  stories: ["../src/**/*.stories.@(ts|tsx)"],

  addons: [
    "@storybook/addon-essentials", // Controls, Actions, Docs, Backgrounds, Viewport
    "@storybook/addon-interactions", // play() function testing
    "@storybook/addon-a11y", // Accessibility panel
  ],

  framework: {
    // @storybook/nextjs handles: webpack, Next.js module stubs (next/image,
    // next/navigation, next/font), and tsconfig path aliases automatically.
    name: "@storybook/nextjs",
    options: {},
  },

  // Serve public/ so components that reference /images or /icons work
  staticDirs: ["../public"],

  docs: {
    // Auto-generate a Docs page for every story tagged with autodocs
    autodocs: "tag",
  },
};

export default config;
