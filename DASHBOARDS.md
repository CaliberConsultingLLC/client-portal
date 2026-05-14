# NSP Dashboard Development Guide

Storybook runs **alongside** the Next.js portal as an isolated sandbox. Build and
iterate on dashboard components here first — then promote them into the live portal
when they're ready. The live portal is never touched during development.

---

## Quick Start

```bash
# Run Storybook on http://localhost:6006
npm run storybook

# Run the Next.js portal on http://localhost:3000 (parallel, independent)
npm run dev

# Static Storybook build (for sharing/review)
npm run build-storybook
```

---

## Project Structure

```
src/
  dashboards/                   ← Storybook-first development zone
    _shared/
      mockHelpers.ts            ← Deterministic mock utilities (scoreFor, pick, etc.)
    EmployeeExperience/         ← One folder per dashboard
      mockData.ts               ← Full mock of EmployeeExperienceDashboardData
      EmployeeExperience.stories.tsx   ← Stories (reference template)

  components/
    charts/                     ← Shared chart primitives (GradientBarChart, HeatmapChart, …)
    dashboard/                  ← DashboardRibbon + DashboardCanvas shell
    ui/                         ← Base primitives (Card, Button, Input, …)

  app/
    employee-experience/dws/    ← Live portal route — do not edit during story work
    collaboration/              ← Live portal route
    integration-effectiveness/  ← Live portal route

.storybook/
  main.ts                       ← Storybook config (framework, addons, story glob)
  preview.tsx                   ← Global decorator (NSP theme, Google Fonts, backgrounds)
```

---

## Creating a New Dashboard

### 1 — Create the folder

```bash
mkdir -p src/dashboards/MyDashboard
```

### 2 — Write the mock data

`src/dashboards/MyDashboard/mockData.ts`

```ts
import type { MyDashboardData } from "@/types/my-dashboard";
import { scoreFor, pick, MOCK_GENERATIONS } from "@/dashboards/_shared/mockHelpers";

export const MOCK_DATA: MyDashboardData = {
  meta: { organizationName: "Acme Corp", ... },
  respondents: [/* hand-craft or generate */],
  // ...
};
```

**Rules for mock data:**
- Use `scoreFor(id, base)` for deterministic scores — same output every run, no `Math.random()`
- Mirror the exact TypeScript interface the real component expects — the mock IS the contract
- Include at least one edge-case variant (empty data, single respondent, no prior campaign)

### 3 — Write the component (if new)

If you're building a net-new component, create it in `src/dashboards/MyDashboard/`:

```tsx
// src/dashboards/MyDashboard/MyDashboard.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";

export function MyDashboard({ data }: { data: MyDashboardData }) {
  return <Card>...</Card>;
}
```

If you're building a story for an **existing** portal component, import it directly:

```tsx
import { DwsEmployeeExperienceDashboardClient } from
  "@/app/employee-experience/dws/dashboard-implementation";
```

### 4 — Write the stories

`src/dashboards/MyDashboard/MyDashboard.stories.tsx`

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MyDashboard } from "./MyDashboard";
import { MOCK_DATA } from "./mockData";

const meta: Meta<typeof MyDashboard> = {
  title: "Dashboards / My Dashboard",
  component: MyDashboard,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof MyDashboard>;

// Primary story
export const Default: Story = { args: { data: MOCK_DATA } };

// Edge-case variant
export const NoData: Story = { args: { data: MOCK_EMPTY_DATA } };

// Drill-down interaction
export const DrillDown: Story = {
  args: { data: MOCK_DATA },
  play: async ({ canvasElement }) => {
    const { within, userEvent } = await import("@storybook/test");
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /details/i }));
  },
};
```

### 5 — Iterate in Storybook

```bash
npm run storybook   # http://localhost:6006
```

Use the **Controls** panel to tweak props live. Use the **Interactions** tab to
replay `play()` functions step by step. Use the **A11y** tab to catch accessibility
issues early.

---

## Promoting a Dashboard to the Portal

When a dashboard is ready for production:

### A — Component is new (built in src/dashboards/)

1. Move the component file to `src/components/` or `src/app/<route>/`
2. Update the import path in the stories file (or leave it pointing to the new location)
3. Register the dashboard in `src/lib/portal/dashboard-registry.tsx`:

```ts
"my-dashboard": {
  assetId: "my-dashboard",
  title: "My Dashboard",
  family: "employee_experience",   // or "collaboration" | "integration"
  render: async ({ dashboardInstanceId } = {}) => {
    const data = await loadMyDashboardData(dashboardInstanceId);
    return <MyDashboardClient data={data} />;
  },
},
```

4. Add a route page at `src/app/my-dashboard/page.tsx` if needed
5. Wire up data loading in `src/lib/my-dashboard/loader.ts`

### B — Component already exists in the portal

The story is already pointing at the production component — nothing to move.
Just ensure the live data loader returns the same shape as the mock.

---

## Design Tokens Quick Reference

All tokens are in `src/app/globals.css` under `@theme inline`. Use them as
Tailwind classes or CSS variables.

| Token | Class / Variable | Value |
|-------|-----------------|-------|
| Navy primary | `bg-nsp-blue-500` / `--color-nsp-blue-500` | `#1E3A5F` |
| Orange accent | `bg-nsp-orange-500` / `--color-nsp-orange-500` | `#C99A3C` |
| Green positive | `bg-nsp-green-500` / `--color-nsp-green-500` | `#2F9151` |
| Red concern | `bg-nsp-red-500` / `--color-nsp-red-500` | `#D94A3A` |
| Surface bg | `bg-surface-2` / `--color-surface-2` | `#F1F4F7` |
| Card bg | `bg-white` (with `nsp-card-shadow`) | `#FFFFFF` |
| Text primary | `text-text-primary` / `--color-text-primary` | `#152238` |
| Text muted | `text-text-muted` / `--color-text-muted` | `#6E7E96` |
| Border strong | `border-border-strong` | `#8798AA` |

Score coloring is handled by `scoreScaleColor()` / `scoreScaleTextColor()` in
`src/components/collaboration/score-color-scale.ts`.

---

## Score Scale

Raw survey scores are stored on a **0–10** scale and displayed as **0–100** via:

```ts
import { formatScoreForDisplay } from "@/lib/collaboration/display-format";
formatScoreForDisplay(7.5)  // → "75.0"
```

Color anchors used across all dashboards:

| Threshold | Color | Meaning |
|-----------|-------|---------|
| ≥ 8.5 | Green (`#5E7898`) | Strong |
| 7.25 | Yellow/neutral | Average |
| ≤ 6.0 | Red (`#C96B60`) | Concern |

---

## Storybook Addons

| Addon | Purpose |
|-------|---------|
| **Essentials** | Controls, Actions, Docs, Backgrounds, Viewport, Toolbars |
| **Interactions** | `play()` functions for simulating user interactions |
| **A11y** | Accessibility audit in the Addons panel |

---

## Notes

- **Never import server-only modules** in dashboard components — Firebase Admin,
  Supabase server clients, etc. must stay in `src/lib/` data loaders, not in
  `src/components/` or `src/dashboards/`.
- **Tailwind v4** — no `tailwind.config.js`. All tokens are in `globals.css`.
  If you add a new token, add it there under `@theme inline`.
- **`@/*` path alias** resolves to `src/` — works in both Next.js and Storybook.
- Storybook runs on **port 6006**; Next.js dev runs on **3000**. They are fully
  independent — you can run both simultaneously.
