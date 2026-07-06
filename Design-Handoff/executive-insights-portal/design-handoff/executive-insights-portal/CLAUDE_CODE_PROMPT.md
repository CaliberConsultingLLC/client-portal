# Claude Code Prompt — Executive Insights Portal

Paste the contents of the **PROMPT** section below into Claude Code verbatim.
The design files and spec are in this same folder.

---

## PROMPT

I need you to implement the **Executive Insights Portal** feature in this Next.js + Firebase codebase (`northstar-platform/`).

A full design spec is in `design-handoff/executive-insights-portal/SPEC.md`. Before writing any code, read that file completely. Also open these two design files in a browser to see the interactive mockups:

- `design-handoff/executive-insights-portal/Executive Insights.dc.html` — the executive-facing portal
- `design-handoff/executive-insights-portal/Admin · Readout Manager.dc.html` — the admin workflow (4 screens)

**What to build:**

1. **Admin: Readout Manager** — a new section at `/admin/readouts` where super admins create, configure, and publish readouts per client. Four screens: readout list, editor with Intro/Findings/Outro tabs, and a publish gate modal.

2. **Executive Portal: Insights page** — at `/portal/insights`, loads the published readout for the current client and displays it as a three-screen flow: intro → findings → outro.

**Before writing any code:**

- Read `SPEC.md` fully
- Read `src/lib/firebase/report-store.ts` — the Firestore CRUD pattern to follow
- Read `src/components/admin/admin-shell.tsx` — the admin layout to extend
- Read `src/components/portal/portal-shell.tsx` — the portal shell (Insights nav item already exists)
- Read `src/app/admin/reports/page.tsx` — the admin list page pattern to follow

**Implementation order:**

1. `src/types/readout.ts` — Readout + ReadoutFinding interfaces
2. `src/lib/firebase/readout-store.ts` — Firestore CRUD
3. `/admin/readouts/page.tsx` — readout list
4. `/admin/readouts/[id]/page.tsx` — editor shell with Intro / Findings / Outro tabs
5. The four editor form components (intro, findings, outro, publish modal)
6. `/portal/insights/page.tsx` — executive portal insights page
7. The viewer components (readout-viewer, readout-intro, readout-findings, readout-outro)

**Important constraints:**

- Follow existing patterns exactly — same Firebase patterns, same shell components, same auth/role checks
- The portal "Edit narrative" button should only be visible to `isInternalUser` (already tracked in portal-shell)
- The findings chart components (favorability bars, history line) should be ported from the design file's JS into proper React components — the score color scale logic already exists at `src/components/collaboration/score-color-scale.ts`, reuse it
- Match the design fidelity exactly — colors, typography, layout dimensions are all specified in SPEC.md
- Only published readouts are visible to executives — draft readouts never appear in the portal

Start with step 1 and work through the list in order. Confirm the data model looks right before proceeding to UI.
