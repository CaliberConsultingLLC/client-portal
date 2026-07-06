# Executive Insights Portal — Implementation Spec
**For Claude Code · Northstar Platform**

---

## What this is

The Executive Insights Portal is a new feature that surfaces curated, narrative-driven readouts to client executives. Instead of navigating raw dashboards, executives see a guided story-like walkthrough of their survey results: **intro → findings → outro** — prepared and published by Caliber super admins before any executive sees them.

## Design reference files

Open these in a browser to see the full interactive design:

- `Executive Insights.dc.html` — the executive-facing portal (intro/findings/outro flow)
- `Admin · Readout Manager.dc.html` — the admin workflow (4 screens: list, intro editor, findings editor, publish gate)

Both files are in the root of this design project alongside this spec.

---

## Codebase context

Key existing files to understand before writing anything:

| File | What it is |
|---|---|
| `src/components/portal/portal-shell.tsx` | Client-facing portal shell — "Insights" nav item already exists |
| `src/components/admin/admin-shell.tsx` | Admin shell to extend |
| `src/lib/firebase/report-store.ts` | Closest analog for Firestore CRUD pattern to follow |
| `src/lib/firebase/portal-store.ts` | Client/status lifecycle pattern |
| `src/components/portal/campaign-status-badge.tsx` | Status badge pattern |
| `src/app/admin/reports/` | Admin section pattern to follow for routing |
| `src/app/portal/dashboards/` | Portal page pattern to follow |

---

## Feature scope

Two surfaces to build:

1. **Admin: Readout Manager** — `/admin/readouts` — super admin creates, edits, publishes readouts per client
2. **Executive Portal: Insights** — `/portal/insights` — executive views the published readout

---

## Firestore data model

### Collection: `readouts/{readoutId}`

```typescript
interface Readout {
  id: string;
  clientId: string;
  campaignId?: string | null;
  name: string;                    // "Oct 2025 EE Readout"
  status: 'draft' | 'published' | 'inactive';

  intro: {
    executiveName: string;         // "Dana"
    executiveRole: string;         // "Top Flight · HR"
    headline: string;
    body: string;
    subHead: string;
    section1Title: string;
    section1Body: string;
    section2Title: string;
    section2Body: string;
    section3Title: string;
    section3Body: string;
    section4Title: string;
    section4Body: string;
    preparedBy: string;
    dateInfo: string;
  };

  findings: ReadoutFinding[];

  outro: {
    nsHead: string;                // "Next steps"
    nsHero: string;
    step1: string;
    step2: string;
    step3: string;
    teamName: string;
    teamContact: string;
    completeLabel: string;         // "Readout complete"
    headline: string;              // "You've seen the full picture."
    body: string;
    priority1Title: string;
    priority1Body: string;
    priority2Title: string;
    priority2Body: string;
    priority3Title: string;
    priority3Body: string;
  };

  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  createdBy: string;
}

interface ReadoutFinding {
  id: string;
  enabled: boolean;
  order: number;
  section: 'stand' | 'strength' | 'watch' | 'sowhat';
  tone: 'good' | 'risk' | 'neutral';
  verdict: string;
  eyebrow: string;
  headlineShort: string;
  headline: string;
  detail: string;
  means?: string | null;
  act?: string | null;
  perspGroup: string;
  persp: string;
  chartTitle: string;
  chartSub: string;
  howToRead: string;
}
```

---

## New files to create

```
src/app/admin/readouts/
  page.tsx                         Screen 01: readout list
  [id]/
    page.tsx                       Screen 02–03: editor shell (tabs: Intro | Findings | Outro)

src/components/admin/
  readout-list.tsx                 Table of readouts per client with status badges
  readout-editor-shell.tsx         Tabbed editor with breadcrumb + publish controls
  readout-intro-form.tsx           Screen 02: intro config form
  readout-findings-form.tsx        Screen 03: findings toggle/reorder list
  readout-outro-form.tsx           Outro config form
  readout-publish-modal.tsx        Screen 04: publish gate modal

src/app/portal/insights/
  page.tsx                         Loads published readout, renders executive view

src/components/portal/
  readout-viewer.tsx               Full viewer shell (manages intro/findings/outro state)
  readout-intro.tsx                Intro screen
  readout-findings.tsx             Findings nav rail + finding detail
  readout-outro.tsx                Outro screen

src/lib/firebase/
  readout-store.ts                 Firestore CRUD (getReadouts, getReadoutById,
                                   createReadout, updateReadout, publishReadout)

src/types/
  readout.ts                       Readout + ReadoutFinding interfaces
```

---

## Admin: Screen 01 — Readout list

**Route:** `/admin/readouts`

- Uses existing `AdminShell`
- Left sidebar: client list (same pattern as other admin pages, Top Flight pre-selected)
- Main content: heading "Readouts" + "New readout" button (right-aligned)
- Table columns: Name | Campaign | Status | Last updated | Actions
- Status badges:
  - `published` → green pill (`#E4EDE5` bg / `#2F7048` text)
  - `draft` → amber pill (`#FDF4E3` bg / `#8A5E0A` text)
  - `inactive` → gray pill
- Row actions:
  - Published: Edit · View
  - Draft: Edit · Publish · Delete
- "New readout" creates a blank draft and navigates to editor
- Note below table: "Only published readouts appear in the client's Insights tab."

---

## Admin: Screen 02 — Editor, Intro tab

**Route:** `/admin/readouts/[id]?tab=intro`

**Header row (sticky):**
- Breadcrumb: Admin › Top Flight › Readouts › [name]
- Status badge (reflects current status)
- "Save draft" button (outline)
- "Publish update" button (green, opens publish modal)

**Tab bar:** Intro (active) | Findings | Outro

**Form layout:** two-column grid

Left column:
1. "Executive address" card
   - First name field (used in headline interpolation)
   - Role / team field
2. "Welcome copy" card
   - Headline textarea
   - Body paragraph textarea

Right column:
1. "Section previews" card — 4 rows, each: title input | description input (side by side)
2. "Attribution" card
   - Prepared by input
   - Date & response stats input

All fields are controlled inputs that auto-save on blur (or explicit save button — your call).

---

## Admin: Screen 03 — Editor, Findings tab

**Route:** `/admin/readouts/[id]?tab=findings`

**Above the list:** "N of N findings enabled" count + hint text "Drag to reorder · toggle to enable/disable"

**Findings list (drag-sortable, use `@dnd-kit/sortable`):**

Each row:
- Drag handle icon (left)
- Toggle (on = green pill shape, off = gray)
- Verdict badge (tone-colored pill: Strength / Watch / Urgent / Trending up / etc.)
- Finding headline (full text)
- "Edit copy" button → opens a side panel or modal to edit headline, detail, means, act copy

Disabled finding styling:
- Row dimmed (opacity 0.5–0.6)
- Headline has text-decoration: line-through
- Right label: "Disabled — not shown to executive"

Note below list: "Disabled findings are hidden from the executive view. Findings appear in the order shown here."

---

## Admin: Screen 04 — Publish gate modal

Triggered by "Publish now" button in editor header.

**Modal content:**
- Icon + title: "Publish this readout?"
- Subtitle: readout name + client name

**Pre-flight checklist (auto-validates):**
- ✓ Intro configured (headline + body non-empty)
- ✓ N findings selected (at least 1 enabled)
- ✓ Outro configured (headline non-empty)

**Who will see it:** avatar + executive name + role (from intro config)

**Warning banner:** "Goes live immediately. [Name] will see this in their Insights tab as soon as you publish. You can update or unpublish at any time."

**Buttons:**
- "Publish now" → sets status to `published`, sets `publishedAt`, closes modal
- "Save as draft" → dismisses modal without publishing

---

## Executive Portal: Insights page

**Route:** `/portal/insights`

Loads the single `published` readout for the current client. If none exists, show an empty state ("No readout published yet").

### Page state

```typescript
type ReadoutPage = 'intro' | 'findings' | 'outro';
const [page, setPage] = useState<ReadoutPage>('intro');
const [findingIndex, setFindingIndex] = useState(0);
```

### Screen: Intro

Two-panel layout (full viewport height minus header):

**Left panel** (dark gradient, fixed 500px width):
```
background: linear-gradient(160deg, #242424 0%, #22301f 100%)
padding: 64px 52px
```
- Gold dot + eyebrow text (client name + campaign date)
- H1 headline (Playfair Display, 40px)
- Body paragraph
- 3 orientation bullets with numbered circles
- "Begin your readout →" CTA button (gold gradient)

**Right panel** (light, flex: 1):
```
background: #EFF2ED
padding: 56px 52px
overflow-y: auto
```
- "What's in this readout" label
- Subhead (Playfair Display)
- 4 section preview cards (tone-colored left border/indicator + title + description)
- Attribution card ("Prepared by" + date/stats)

### Screen: Findings

Three-section layout:

**Left rail** (332px, dark):
- "Your readout" label + campaign/count subtext
- Legend: Strength / Watch / Context
- Section-grouped finding nav buttons
- Active finding: gold-tinted background + glowing dot

**Main content** (flex: 1):

Two layout variants (consultant can switch):
- **Brief** — narrative left column (40%) + data panel right (60%)
- **Stage** — large headline + data hero (70%) + narrative sidebar (30%)

Both variants show:
- Eyebrow + verdict badge + "Finding N of N"
- Headline (Playfair Display, contentEditable when editing enabled)
- Detail paragraph (contentEditable when editing enabled)
- "The read" card (interpretation)
- "Do this next" card with CTA to open dashboard perspective
- Stat callout (on Stage variant)

**Footer nav:**
- Dot progress indicator
- "← Intro" on first finding, "← Prev" otherwise
- "Finish →" on last finding, "Next →" otherwise

### Screen: Outro

Two-panel layout (mirror of intro, panels swapped):

**Left panel** (dark, 420px):
- "Next steps" label
- Hero headline (Playfair Display)
- 3 numbered next steps
- Caliber team contact card
- "Schedule a debrief →" CTA

**Right panel** (light, flex: 1):
- "Readout complete" status indicator
- Outro headline + body
- 3 priority action cards (ranked 1–3, tone-colored)
- "← Review findings again" link button

---

## Inline editing (consultant mode)

The "Edit narrative" button in the portal header (visible to internal Caliber users, not executives) enables `contentEditable` on all text fields across all three screens. On blur, the edit saves back to the readout document in Firestore.

Gate this using the existing `isInternalUser` check already in `portal-shell.tsx`.

---

## Design tokens

```
/* Backgrounds */
--bg-page:        #EEF2EE
--bg-light:       #EFF2ED
--bg-content:     #F5F8F5
--bg-dark-panel:  linear-gradient(160deg, #242424 0%, #22301f 100%)
--bg-header:      linear-gradient(100deg, #242424 0%, #2B2B2B 60%, #2F4A38 150%)

/* Text */
--text-primary:   #152238
--text-secondary: #3B4B63
--text-tertiary:  #6E7E96
--text-on-dark:   #ffffff

/* Accent */
--gold:           #E8CC70
--gold-deep:      #C99A3C
--gold-bg:        rgba(232, 204, 112, 0.15)

/* Tone: Strength */
--green:          #2F9151
--green-bg:       #E7F2EB
--green-action:   #386B45
--green-act-bg:   #F1F8F3
--green-border:   #CDE6D5

/* Tone: Risk */
--red:            #C96B60
--red-bg:         #FBEBE9
--red-act-bg:     #FCF1EF
--red-border:     #F0D6D2

/* Tone: Neutral/Context */
--blue:           #5E7898
--blue-bg:        #E9F0F7

/* Borders */
--border-card:    #8798AA
--border-light:   #DCE3DD
--border-divider: #D4DAD4

/* Typography */
--font-sans:      "Montserrat", "Segoe UI", sans-serif
--font-serif:     "Playfair Display", serif
```

---

## Notes for implementation

1. **Start with the data model** — get `readout-store.ts` and the Firestore schema solid first. Everything else depends on it.
2. **Admin list page is the simplest** — build it first to confirm routing and data fetching work.
3. **The portal viewer is the most complex** — the findings chart rendering (fav bars, history line, action cards) is all in the design file's JS class. Port that to React components.
4. **Charts** — the favorability bar chart and history line chart are custom SVG. Port them from the design file's `favBars()` and `history()` methods into React components. The score color scale logic is already in `src/components/collaboration/score-color-scale.ts` — reuse it.
5. **Don't rebuild what exists** — the portal shell, admin shell, Firebase auth, and client/role patterns are all already working. Layer on top.
