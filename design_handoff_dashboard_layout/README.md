# Handoff: Client Portal Dashboard Layout Redesign

## Overview

This is a **layout-only** redesign of the in-dashboard experience of the Caliber client portal — i.e. what a Caliber consultant or a client leader sees while they are *inside* one of their dashboards. The goal is to give leaders clear, powerful visuals without overwhelming them, and to maximize the main content (data) area by relocating navigation and reclaiming chrome space.

This is **not** a redesign of the color palette, the data visualizations themselves, or any other portal surface. It changes **where things live and how they collapse**, not the brand.

### What changed vs. the current portal, in one paragraph

The second horizontal white "dashboard ribbon" bar (title + category pills + `Reports:` perspective pills) is **removed entirely**. Its responsibilities move into two places: (1) the **left rail becomes the report navigator** — Views (groups) → Reports, as an accordion, plus a "current report" marker under the client logo; and (2) the **report title moves into the content area** as a proper page header. The **right rail** holds **Context** and **Filters** as two tabs. Both side rails **collapse** to a 44px icon strip. A single slim dark top bar remains.

---

## About the Design Files

The file in this bundle (`Dashboard Layout Redesign.dc.html`) is a **design reference created in HTML** — a working prototype that shows the intended layout, structure, spacing, and interaction behavior. It is **not** production code to copy directly, and it is **not** built on the portal's React/Next.js/Tailwind stack.

`support.js` is only the runtime that lets the `.dc.html` prototype render in a browser. **Ignore it for implementation** — do not port it.

**The task is to recreate this layout in the existing Northstar/Caliber portal codebase** (Next.js App Router + React + Tailwind v4), using its established components and patterns:
- `src/components/portal/portal-shell.tsx` — the outer shell / top banner
- `src/components/shared/app-top-banner.tsx` — the dark top bar
- `src/components/dashboard/dashboard-shell.tsx` — currently holds `DashboardRibbon` (the bar we are removing) + `DashboardCanvas`
- `src/components/portal/portal-page-frame.tsx` — the 3-column `260px | 1fr | 260px` grid (left rail | content | right rail)
- `src/components/dashboard/guidance-pin-rail.tsx` — the current left-rail guidance component

Keep the portal's real colors, fonts (Montserrat), and existing chart components. Only the **layout, chrome behavior, and navigation model** should follow this design.

## Fidelity

**High-fidelity (hifi) for layout and interaction; illustrative for content.**
- Layout structure, spacing, rail widths, collapse behavior, typography scale, and the top-bar user chip are hifi — implement them precisely.
- The specific data shown (dimension scores, heatmap numbers, KPI values, report names like "Engagement & Retention") is **placeholder sample content** to make the layout legible. Wire real portal data in its place.
- Exact hex values are provided below, but note the portal's canonical tokens live in `src/app/globals.css` (`--color-*`) and `src/components/portal-kit/colors.ts` — **prefer the codebase tokens** where they match.

---

## Screens / Views

There is one screen — the dashboard instance view — with several interactive states. Full-viewport layout, `height: 100vh`, no page scroll; only the center column scrolls.

### Overall layout

```
┌──────────────────────────────────────────────────────────────┐
│  DARK TOP BAR  (single, slim ~60px, hideable)                 │
├────────────┬────────────────────────────────┬────────────────┤
│ LEFT RAIL  │  CENTER (scrolls)              │  RIGHT RAIL     │
│ 260px      │  1fr                           │  260px          │
│ (→44px)    │                                │  (→44px)        │
│            │  • Title header                │  Tabs:          │
│ • Client   │  • KPI row                     │   Context |     │
│   card     │  • Dimension score bars        │   Filters      │
│ • Current  │  • Statement heatmap           │                 │
│   report   │                                │                 │
│ • VIEWS    │                                │                 │
│   accordion│                                │                 │
└────────────┴────────────────────────────────┴────────────────┘
```

Root: `display:flex; flex-direction:column`. Below the top bar: a `flex:1` row containing left rail (`flex-shrink:0`), center (`flex:1; overflow-y:auto`), right rail (`flex-shrink:0`).

---

### 1. Top bar (dark)

- **Height:** 60px. **Background:** `linear-gradient(100deg,#242424 0%,#2B2B2B 60%,#2F4A38 150%)`. This matches the existing `app-top-banner.tsx` dark tone — reuse that component; do **not** restyle it beyond the right-side chip.
- **Left:** Caliber logo mark (26px gold rounded square, `linear-gradient(135deg,#E8CC70,#C99A3C)`, letter "C") + wordmark "CALIBER" (12px, weight 700, letter-spacing 0.22em, white). Then a 1px `rgba(255,255,255,0.14)` divider, then the global nav pills (Home / Dashboards / Insights / Reports / Census). Active pill = `background:rgba(232,204,112,0.14); border:1px solid rgba(232,204,112,0.22); color:#fff`. Inactive = `color:rgba(255,255,255,0.6)`.
- **Right side — THIS IS THE PIECE THE CLIENT SPECIFICALLY WANTS (the user-chip formatting):**
  - A right-aligned two-line stack:
    - Line 1: user name — `font-size:12px; font-weight:600; color:#fff` (e.g. "Dana Whitfield")
    - Line 2: company · role — `font-size:10px; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:rgba(232,204,112,0.82)` (e.g. "TOP FLIGHT · HR")
  - Then a 1px `rgba(255,255,255,0.14)` vertical divider.
  - Then a small square "minimize" button: 30×30, `border-radius:9px`, `background:rgba(255,255,255,0.08)`, `border:1px solid rgba(255,255,255,0.14)`, gold chevron `⌃` glyph (`#E8CC70`).
  - **Note from client:** the minimize arrow is optional. With only one top bar, they may not need the hide behavior. Keep the arrow's *visual formatting* of the name/company block regardless; the collapse action itself can be dropped if you don't implement bar-hiding.

#### (Optional) hide behavior
If retained: the whole top bar is wrapped so it can collapse via `max-height` transition (`60px → 0`, `transition: max-height 0.38s cubic-bezier(0.4,0,0.2,1)`). When hidden, a small "▾ Menu" tab peeks at top-center (`border-radius:0 0 14px 14px`, dark gradient, gold text) to reveal it. It also auto-hides on scroll-down / reveals on scroll-up of the center column. **This is optional** — the client is fine leaving a single always-on bar.

---

### 2. Left rail — the report navigator (260px expanded)

Background `#E8ECE9`, right border `1px solid #D4DAD6`. Content padded `16px 13px 60px`, `display:flex; flex-direction:column; gap:12px`, `overflow-y:auto`.

**a) Client card** — white, `border-radius:16px`, `border:1px solid #8798AA`, `box-shadow:0 1px 3px rgba(15,23,42,0.07)`, padding `14px`, centered:
- 40px gold rounded-square avatar (`linear-gradient(135deg,#E8CC70,#C99A3C)`, initials "TF")
- Client name — `font-size:11px; font-weight:700; letter-spacing:0.07em; text-transform:uppercase; color:#152238`
- Sub — `font-size:10.5px; color:#6E7E96` (e.g. "Collaboration Index · Fall 2024")

**b) Current-report marker** — a gold-tinted card that names the report currently open:
- `border-radius:13px; border:1px solid #E3D3A6; border-left:3px solid #C99A3C; background:linear-gradient(180deg,#FCF7EA,#FBF3DF); padding:11px 13px`
- Eyebrow = the parent View name — `font-size:9px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; color:#A47C2F`
- Title = report name — `font-size:13px; font-weight:700; color:#152238`

**c) "Views" label** — `font-size:9.5px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:#8798AA`.

**d) Views accordion** — this is the core navigation. **Views are groups; each contains Reports.**
- **View header (group):** a full-width button, padding `9px 10px`, `border-radius:10px`. When the group contains the active report, `background:rgba(201,154,60,0.08)`, label weight 700, color `#152238`; otherwise transparent, weight 600, color `#3B4B63`. Row = `label (flex:1, 12.5px)` + a count chip (`font-size:10px; font-weight:700; color:#8798AA; background:#DDE3DE; border-radius:99px; padding:1px 7px`) + a `▾` chevron that rotates 180° when the group is open (`transition:transform 0.2s`).
- **Accordion behavior:** exactly **one group open at a time** (opening one closes the others) so the rail never grows unbounded. Selecting a report keeps its group open. Default: the active report's group is open.
- **Report list (inside an open group):** an indented column — `margin-left:15px; border-left:1px solid #CDD6CF; padding:3px 0 5px; gap:2px`.
  - **Report item:** full-width button, padding `8px 10px 8px 12px`, `border-radius:9px`. Active = `background:#fff; border:1px solid #8798AA; box-shadow:0 1px 3px rgba(15,23,42,0.08); color:#152238; weight:700`; inactive = transparent border, `color:#59675C; weight:600`. Leading 5px dot: active `#C99A3C`, inactive `#C8D2CF`. Label `font-size:12px`.

Sample content (replace with real Views/Reports):
- **Executive View** (3): CI Executive Summary · Action Priorities · Relationship Map
- **HR View** (3): Engagement & Retention · Manager Effectiveness · Onboarding Pulse
- **Department View** (4): Engineering · Product · Sales · Finance

> There is intentionally **no "Insights"/guidance-pins section** in the left rail — it was removed per client direction.

**Collapsed left rail (44px):** vertical strip, centered icons, `gap:10px`, padding `16px 0`: the "TF" avatar (30px), a 1px divider, and a 30px white rounded-square button with a `☰` glyph (`title="Views & reports"`). A floating 30px round toggle button sits at the rail's right edge, vertically centered (`right:-15px; top:50%`), white with `border:1px solid #8798AA`, `box-shadow:0 2px 8px rgba(15,23,42,0.14)`, chevron `‹` (expanded) / `›` (collapsed).

---

### 3. Center content (scrolls)

Background white, inner wrapper `max-width:1200px; margin:0 auto; padding:22px 28px 52px`.

**a) Title header** (this replaces the removed white ribbon):
- A flex row, `justify-content:space-between; align-items:flex-start`, `border-bottom:1px solid #EEF1EE; padding-bottom:18px; margin-bottom:22px`.
- Left: eyebrow — `font-size:10px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:#8798AA` (e.g. "EXECUTIVE VIEW · FALL 2024 · FULL ORGANIZATION"); then the report title `<h1>` — `font-size:25px; font-weight:800; letter-spacing:-0.02em; color:#152238`.
- Right: an **Export** button only — `padding:6px 14px; border-radius:99px; background:#fff; border:1px solid #D4DAD6; font-size:12px; font-weight:600; color:#3B4B63`.
- **No "Updated" date chip** (removed per client). Nothing renders below the title header from this design — the client keeps their own content there.

**b) KPI row** — 4-up grid, `gap:12px`. Each card: `border-radius:16px; border:1px solid #E2E8EF; background:#F8FAFA; padding:16px 18px`. Label (10px, 700, letter-spacing 0.2em, uppercase, `#8798AA`), big value (28px, 800, `#152238`) + unit (13px, `#8798AA`), optional trend pill (`background:#E7F2EB; color:#2F7048`). *(KPI content is illustrative — this design does not dictate what sits below the title in the real app; the client keeps their existing content there. Included only to show the header in context.)*

**c) Dimension score bars & (d) heatmap** — shown only to populate the layout. **Use the portal's existing chart components** (`portal-kit/score-bar-chart.tsx`, `portal-kit/statement-heatmap.tsx`, and `score-color-scale.ts` for the canonical color scale). Do not port the prototype's inline bars/colors; they are placeholders and the score gradient will not match the real one.

---

### 4. Right rail — Context & Filters (260px expanded)

Background `#E8ECE9`, left border `1px solid #D4DAD6`. **Keep left=Context, right=Filters order as-is** (client confirmed).

**Tab bar** (sticky at rail top): two equal buttons on `background:#DDE3DE`, bottom border `1px solid #D4DAD6`. Active tab: `background:#fff; color:#152238; border-bottom:2px solid #2F9151`. Inactive: transparent bg, `color:#6E7E96`, transparent bottom border. Labels `font-size:10.5px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase`.

**Context tab** — three white cards (`border-radius:13px; border:1px solid #C8D2CF; padding:14px 13px`), stacked `gap:9px`:
1. **Campaign** — eyebrow "CAMPAIGN"; name "Fall 2024 Survey" (13px, 700); date range "Oct 7 – Oct 21, 2024" (11px, `#6E7E96`); divider; then a pulsing 7px green dot (`#2F9151`, `@keyframes` opacity 1↔0.4, 2s) + "87% response rate" (`#2F7048`). **Response rate must be a placeholder / data-bound** — the real value gets filled in.
2. **Sample** — eyebrow "SAMPLE"; rows: Respondents 312 · Departments 5 · Statements 42 (label `#3B4B63` 12px, value `#152238` 13px 700).
3. **Score Legend** — eyebrow "SCORE LEGEND"; four rows, each a 10px square + text: 80+ · Strength (`#2F9151`), 70–79 · On track (`#5B7EA8`), 60–69 · Watch (`#C99A3C`), <60 · Risk (`#D94A3A`). *(Legend colors are placeholders — align to the portal's real score scale.)*

**Filters tab** — two white cards (same card style), `gap:9px`:
1. **Department** — eyebrow "DEPARTMENT"; wrapped pill buttons (`padding:4px 10px; border-radius:99px; font-size:11px; font-weight:600`). Selected = `background:#152238; border:1px solid #152238; color:#fff`; unselected = `background:#F5F7F5; border:1px solid #D4DAD6; color:#3B4B63`. Options: All / Engineering / Product / Sales / HR / Finance.
2. **Role Level** — same pill treatment. Options: All / Manager / IC / Director+.
- **No "Show Benchmark" toggle** — removed per client (no industry benchmark exists yet).

The filter pills are intentionally compact — this smaller footprint vs. the current portal filter UI is a key thing the client wants to keep.

**Collapsed right rail (44px):** two 30px white rounded-square icon buttons — `📊` (Context) and `⚙️` (Filters) — separated by a 1px divider. Clicking either expands the rail directly to that tab. Same floating toggle button as the left rail, mirrored to the rail's left edge (`left:-15px`), chevron `›` (expanded) / `‹` (collapsed).

---

## Interactions & Behavior

- **Select report:** clicking a report item sets it active, keeps its View group open, updates the current-report marker (left) and the title header (center). Accordion enforces single-open-group.
- **Toggle View group:** clicking a View header opens it and closes any other open group.
- **Collapse/expand a rail:** the edge toggle animates the rail `width` between `260px` and `44px` (`transition: width 0.32s cubic-bezier(0.4,0,0.2,1)`). Collapsed rails show icon affordances; clicking a right-rail icon expands straight to that tab.
- **Right-rail tabs:** switch Context / Filters content.
- **(Optional) hide top bar:** `max-height` collapse + auto-hide on center scroll + "▾ Menu" reveal tab. Optional per client.
- **Transitions:** rail width `0.32s`, chrome `0.38s`, small state changes `0.15–0.2s`, all `cubic-bezier(0.4,0,0.2,1)` (or ease). Pulsing response-rate dot is a 2s infinite opacity keyframe.

## State Management

- `activeReportId` — currently selected report; derives active View, marker text, and title header.
- `openViewId` — which accordion group is expanded (single value; `null` allowed).
- `leftExpanded`, `rightExpanded` — rail collapse booleans.
- `rightTab` — `'context' | 'filters'`.
- `activeDept`, `activeRole` — selected filter pills (wire to real filtering).
- *(Optional)* `headerVisible` + `lastScrollY` — for the hide-on-scroll top bar.
- Removed: any `showBenchmark` state.

Data needed: the Views→Reports tree for the current dashboard instance; campaign metadata (name, dates, **response rate**, sample counts); the report's own visualization data (already handled by existing portal chart components).

## Design Tokens

Prefer the codebase's tokens (`src/app/globals.css`, `portal-kit/colors.ts`) where they match; these are the literal values used in the prototype:

**Surfaces:** page `#EEF2EE` · rails `#E8ECE9` · center `#FFFFFF` · card-tint `#F8FAFA` · rail-card `#fff` · tab-bar `#DDE3DE`
**Borders:** strong `#8798AA` · default `#D4DAD6` · subtle `#C8D2CF` / `#E2E8EF` / `#EEF1EE`
**Text:** primary `#152238` · secondary `#3B4B63` · muted `#6E7E96` · faint `#8798AA` · on-dark `#fff`
**Brand dark bar:** `linear-gradient(100deg,#242424 0%,#2B2B2B 60%,#2F4A38 150%)`
**Gold:** `#E8CC70` / `#C99A3C` · deep `#A47C2F` · tint bg `rgba(201,154,60,0.08)` · marker card `linear-gradient(180deg,#FCF7EA,#FBF3DF)` border `#E3D3A6`
**Score/status (placeholder — map to real scale):** green `#2F9151` (bg `#E7F2EB`, text `#2F7048`) · blue `#5B7EA8` · gold `#C99A3C` · red `#D94A3A`
**Type:** Montserrat (400/500/600/700/800). Eyebrows: 9–10px, 700, letter-spacing 0.16–0.2em, uppercase. Report H1: 25px/800. Body: 11–13px.
**Radius:** cards 13–18px · pills 99px · small buttons/squares 9–11px
**Rail widths:** 260px expanded, 44px collapsed. Top bar 60px.
**Shadows:** card `0 1px 3px rgba(15,23,42,0.08)` · float `0 2px 8px rgba(15,23,42,0.14)`.
**Easing:** `cubic-bezier(0.4,0,0.2,1)` — rails 0.32s, chrome 0.38s.

## Assets

No image assets. All icons are Unicode glyphs (`⌃ ▾ ‹ › ☰ 📊 ⚙️`) as placeholders — **substitute the portal's existing icon set** (it uses `lucide-react`; e.g. `ChevronLeft/Right`, `PanelLeft`, `SlidersHorizontal`, `BarChart3`, `Minimize2`). The "TF"/Caliber avatars are CSS gradients; use the real client logo (`RailClientCard` pattern already exists in `live-collaboration-dashboard.tsx`).

## Files

- `Dashboard Layout Redesign.dc.html` — the design reference prototype (open in a browser to see it live and interact with all states).
- `support.js` — prototype runtime only; **do not port**.

### Key existing codebase files to modify/reference
- `src/components/dashboard/dashboard-shell.tsx` — remove/replace `DashboardRibbon`; move report title into content header.
- `src/components/portal/portal-page-frame.tsx` — the 3-col grid; add rail collapse behavior.
- `src/components/dashboard/guidance-pin-rail.tsx` — left rail; replace guidance-pin content with the Views→Reports accordion (guidance/insights removed from this surface).
- `src/components/shared/app-top-banner.tsx` — keep; adopt the right-side user-chip formatting described above.
- `src/components/portal-kit/*` + `score-color-scale.ts` — reuse for the actual visualizations.
