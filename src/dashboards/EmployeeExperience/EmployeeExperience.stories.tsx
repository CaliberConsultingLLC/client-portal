/**
 * Employee Experience Dashboard — Storybook Stories
 *
 * REFERENCE TEMPLATE — copy this pattern for every new dashboard.
 *
 * Demonstrates:
 *   ✓ Full dashboard rendered with mocked data (no backend needed)
 *   ✓ Multiple story variants (full data, no comparison, minimal/edge-case)
 *   ✓ Controls panel wired to data args for interactive exploration
 *   ✓ Filtering interaction via play() function
 *
 * How to add a new dashboard:
 *   1. Create src/dashboards/<Name>/mockData.ts  (copy this pattern)
 *   2. Create src/dashboards/<Name>/<Name>.stories.tsx  (copy this file)
 *   3. Run `npm run storybook` and iterate in isolation
 *   4. When ready, promote the component to src/components/ or src/app/
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Meta, StoryObj } from "@storybook/react";
import { within, userEvent } from "@storybook/test";
import { DwsEmployeeExperienceDashboardClient } from "@/app/employee-experience/dws/dashboard-implementation";
import { MOCK_DASHBOARD_DATA, MOCK_MINIMAL_DATA } from "./mockData";
import type { EmployeeExperienceDashboardData } from "@/types/employee-experience";

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof DwsEmployeeExperienceDashboardClient> = {
  title: "Dashboards / Employee Experience",
  component: DwsEmployeeExperienceDashboardClient,

  // Auto-generate a Docs page from JSDoc + story descriptions
  tags: ["autodocs"],

  parameters: {
    // Full-page layout — dashboards need the full viewport
    layout: "fullscreen",
    docs: {
      description: {
        component: `
The Employee Experience Dashboard surfaces survey data across three audience groups:

- **Executive** — org-wide campaign overview with constellation visualization + location heatmap
- **HR** — department rankings (heatmap), index deep dive, supervisor reports, open text
- **Department** — focused scorecard for a single department

All filtering and drill-down logic runs client-side against the \`respondents\` array.
Data can be swapped by passing a different \`data\` prop — no other changes needed.
        `,
      },
    },
  },

  // Map component props to Storybook Controls
  argTypes: {
    data: {
      control: false, // complex object — swap via story variants instead
      description: "Full EmployeeExperienceDashboardData object. Swap to test different orgs or campaigns.",
      table: {
        type: { summary: "EmployeeExperienceDashboardData" },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DwsEmployeeExperienceDashboardClient>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/**
 * Full dataset with two campaigns — the primary story.
 * Shows the Executive > Campaign Overview page on load, complete with
 * constellation visualization and campaign delta arrows.
 */
export const FullDashboard: Story = {
  name: "Full Dataset (2 Campaigns)",
  args: {
    data: MOCK_DASHBOARD_DATA,
  },
  parameters: {
    docs: {
      description: {
        story: "Default view with two campaigns (June 2025 vs December 2024). Explore all three audience groups via the top navigation ribbon.",
      },
    },
  },
};

/**
 * Single campaign — no prior data for comparison.
 * Tests that delta chips render gracefully (show "—" rather than crashing)
 * and that "No comparison" shows correctly in the left rail.
 */
export const NoPriorCampaign: Story = {
  name: "Single Campaign (No Comparison)",
  args: {
    data: {
      ...MOCK_DASHBOARD_DATA,
      meta: {
        ...MOCK_DASHBOARD_DATA.meta,
        priorCampaignLabel: null,
        campaigns: ["June 2025"],
      },
      respondents: MOCK_DASHBOARD_DATA.respondents.filter(
        (r) => r.campaignLabel === "June 2025"
      ),
    } satisfies EmployeeExperienceDashboardData,
  },
  parameters: {
    docs: {
      description: {
        story: "Only the current campaign is present. Confirms that delta chips show '—' and the comparison selector shows 'No comparison' gracefully.",
      },
    },
  },
};

/**
 * Minimal dataset — 6 respondents, single campaign.
 * Exercises minimum-segment guards: departments with < 3 responses
 * should be excluded from rankings and heatmaps.
 */
export const MinimalData: Story = {
  name: "Minimal Data (Edge Case)",
  args: {
    data: MOCK_MINIMAL_DATA,
  },
  parameters: {
    docs: {
      description: {
        story: "Only 6 respondents in a single campaign. Tests minimum-segment guards — most breakdowns should show 'no groups meet the minimum threshold'.",
      },
    },
  },
};

/**
 * HR Department Rankings view.
 * Opens directly to the HR > Department Rankings heatmap so you can
 * evaluate the heatmap component without clicking through the nav.
 *
 * Note: story navigation state is controlled via the play() function —
 * this is the recommended pattern for drill-down interaction testing.
 */
export const HRDepartmentRankings: Story = {
  name: "HR → Department Rankings (Heatmap)",
  args: {
    data: MOCK_DASHBOARD_DATA,
  },
  parameters: {
    docs: {
      description: {
        story: "Navigates to HR > Department Rankings automatically via play(). Tests the heatmap rendering with real department × dimension data.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click the "HR" group button in the ribbon
    const hrButton = await canvas.findByRole("button", { name: /^hr$/i });
    await userEvent.click(hrButton);

    // Click the "Department Rankings" perspective button
    const rankingsButton = await canvas.findByRole("button", { name: /department rankings/i });
    await userEvent.click(rankingsButton);
  },
};

/**
 * Supervisor Reports view with a supervisor pre-selected.
 * Demonstrates drilling into a specific supervisor's detail view.
 */
export const SupervisorReport: Story = {
  name: "HR → Supervisor Reports",
  args: {
    data: MOCK_DASHBOARD_DATA,
  },
  parameters: {
    docs: {
      description: {
        story: "Navigates to HR > Supervisor Reports. Expand the 'Focus' section in the left rail and select a supervisor to see their individual report.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const hrButton = await canvas.findByRole("button", { name: /^hr$/i });
    await userEvent.click(hrButton);

    const supButton = await canvas.findByRole("button", { name: /supervisor reports/i });
    await userEvent.click(supButton);

    // Open the "Focus" rail section to reveal supervisor selector
    const focusToggle = await canvas.findByRole("button", { name: /focus/i });
    await userEvent.click(focusToggle);
  },
};

/**
 * Department Scorecard — Corporate department.
 * Opens the Department group, expands the Focus rail, and selects Corporate.
 */
export const DepartmentScorecard: Story = {
  name: "Department → Scorecard (Corporate)",
  args: {
    data: MOCK_DASHBOARD_DATA,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const deptButton = await canvas.findByRole("button", { name: /^department$/i });
    await userEvent.click(deptButton);

    // Open Focus rail
    const focusToggle = await canvas.findByRole("button", { name: /focus/i });
    await userEvent.click(focusToggle);

    // Select Corporate department
    const select = await canvas.findByRole("combobox");
    await userEvent.selectOptions(select, "Corporate");
  },
};

/**
 * Open Text — Desired Changes feed.
 * Navigates to HR > Open Text and switches to the improvement question type.
 */
export const OpenTextImprovements: Story = {
  name: "HR → Open Text (Desired Changes)",
  args: {
    data: MOCK_DASHBOARD_DATA,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const hrButton = await canvas.findByRole("button", { name: /^hr$/i });
    await userEvent.click(hrButton);

    const openTextButton = await canvas.findByRole("button", { name: /open text/i });
    await userEvent.click(openTextButton);

    // Expand Focus to reveal Question Type dropdown
    const focusToggle = await canvas.findByRole("button", { name: /focus/i });
    await userEvent.click(focusToggle);

    // Switch to "Desired Changes"
    const typeSelect = (await canvas.findAllByRole("combobox"))[0];
    if (typeSelect) await userEvent.selectOptions(typeSelect, "improvement");
  },
};
