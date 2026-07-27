# Handoff: Insights Readout (Client-Facing Slide Experience)

## Overview
A redesign of the portal's **Insights** tab (`/portal/insights`) — the client-facing "readout" that Caliber Consulting presents to executive leadership (e.g. Deep Well Services). It replaces the current `ReadoutViewer` (intro / findings / outro) with a slide-based experience: a cover page with a clickable agenda, followed by N content slides, each built as a two-column board of draggable/resizable cards (image "visuals" + text cards). An admin edit mode allows in-place text editing, layout manipulation, adding slides/cards, and PNG/PDF export.

## About the Design Files
The files in this bundle are **design references created in HTML** — a working prototype showing intended look and behavior, NOT production code to copy directly. The task is to **recreate this design inside the existing northstar-platform Next.js codebase** (`src/app/portal/insights/`, `src/components/portal/readout-*.tsx`), using its established patterns: React client components, Tailwind, the existing readout types in `src/types/readout.ts` (extend as needed), and the portal's persistence layer (replace the prototype's `localStorage` with the real readout storage/API).

`DWS Insights Readout v1.dc.html` is the prototype. Ignore its custom template syntax (`{{ }}`, `<sc-for>`, `<sc-if>`, the `<x-dc>` wrapper and `support.js`) — read it for exact markup structure, inline style values, and the logic class at the bottom (plain React-style class, `renderVals()` = derived props) for behavior. `image-slot.js` is a drop-target web component used for image uploads; in production, replace with your own upload component wired to real storage.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and interactions are final. Recreate pixel-perfectly with the codebase's existing Tailwind config (the palette below already matches the portal's brand values).

## Data Model
Everything is data-driven. Suggested shape (extend `src/types/readout.ts`):

```ts
type ReadoutDeck = {
  waveLabel: string;                    // "Wave 3 · June 2026"
  order: string[];                      // slide ids, presentation order
  slides: Record<string, ReadoutSlide>;
};
type ReadoutSlide = {
  label: string;        // kicker, e.g. "Trajectory" (also the agenda title)
  pill: string;         // status chip text, e.g. "Steady climb"
  pillBg: string; pillFg: string; dot: string;   // chip + dot colors
  headline: string;     // slide H2
  blurb: string;        // agenda description line
  r: number;            // column A width fraction (0.25–0.78)
  cols: [string[], string[]];           // block ids per column
  blocks: Record<string, ReadoutBlock>;
};
type ReadoutBlock =
  | { type: "visual"; slot: string;     // image persistence key
      sub: string;                      // header subtitle, e.g. "Favorability over time"
      persp: string;                    // dashboard perspective it links to
      caption: string; h?: number }     // optional fixed height px (else flex-fill)
  | { type: "text"; color: number;      // preset index 0–6
      size?: 0 | 1 | 2;                 // text size preset
      subtitle: string; body: string };
```
Persistence in the prototype is `localStorage` (`dws-readout-v1-board`); production should store per-client readout documents (draft/published like the existing `ReadoutStatus`).

## Screens / Views

### 1. Cover (slide index 0)
Two panels filling the viewport under the portal top banner.

**Left panel** — `width: min(500px, 44%)`, min-width 320px, `linear-gradient(160deg, #242424 0%, #22301F 100%)`, padding 56px 44px, vertically centered (use "safe center" so it scrolls from the top when short):
- **Prepared for** block: 58×58 white rounded-12px square containing the client (DWS) logo (6px padding, shadow `0 6px 18px rgba(0,0,0,0.3)`), beside it a 10px/700 uppercase label `rgba(255,255,255,0.45)` letter-spacing 0.22em reading "Prepared for", and 15px/700 white editable client name. Margin-bottom 16px.
- **Prepared by** block: identical format directly below, with the Caliber seal in the square, label "Prepared by", editable "Caliber Consulting". Margin-bottom 30px.
- **Kicker**: 6px gold dot (#E8CC70) + editable 11px/600 uppercase, letter-spacing 0.24em, `rgba(232,204,112,0.8)`: "Insight readout · {waveLabel}".
- **H1**: Playfair Display 40px/1.12, weight 600, white, editable. ("The Deep Well experience, in three short chapters.")
- **Body**: 15px/1.65 `rgba(255,255,255,0.65)`, editable.
- **Buttons row**: primary pill "Begin the readout →" (gradient `linear-gradient(135deg,#E8CC70,#C99A3C)`, #242424 text, 14px/700, padding 14px 26px, radius full, shadow `0 8px 24px rgba(201,154,60,0.3)`) and secondary outline pill "Download all ⤓" (1px border `rgba(232,204,112,0.55)`, #E8CC70 text, transparent bg).

**Right panel** — flex 1, #EFF2ED, padding 48px 40px, safe-centered column:
- Kicker 11px/700 uppercase #6E7E96 "What's in this readout"; Playfair 21px/1.35 #152238 editable subhead.
- **Agenda cards** (one per slide, from data): white, radius 14px, border 1px #DCE3DD, padding 15px 18px, 14px gap row. Contents: Roman numeral (I, II, III…) in Playfair 20px/600 #C99A3C (min-width 34px), then editable title 12.5px/700 #152238 and editable description 12px/1.5 #6E7E96, then a "→" 13px #9AA7B4. Hover: border #C99A3C + shadow `0 6px 16px rgba(21,34,56,0.08)`. Click navigates to that slide (disabled while editing).
- **Closing card** (static): dashed border #C9D2D8, bg `rgba(255,255,255,0.6)`, numeral = next Roman numeral in #9AA7B4, title "What happens next", desc "Priorities we'll set together — covered live in your debrief.", right-aligned "LIVE" chip (#E8ECE9 bg, 10px/700 uppercase #6E7E96).

### 2. Content slide (repeated per slide)
Background #EFF2ED, padding 26px 44px 78px, fixed height (content never scrolls the page; columns scroll internally).

- **Header row** (flex, gap 12, wrap): 10px colored dot (`slide.dot`); editable kicker 11.5px/600 uppercase letter-spacing 0.2em #6E7E96 (`slide.label`); editable status pill (10.5px/700, radius full, `slide.pillBg`/`slide.pillFg`, padding 3px 10px); then right-aligned: **download button** (30px circle, 1px border #CBD4CC, white bg, "⤓" #3B4B63, hover gold) and counter "Slide N of M" 11.5px/600 #9AA7B4.
- **Headline**: editable Playfair 31px/1.14 #152238, weight 600, max-width 1050px.
- **Divider**: 2px rule — first 46px #C99A3C, remainder #DCE3DD; margin-bottom 16px.
- **Board**: CSS grid `{A}fr 26px {B}fr` (from `slide.r`), fills remaining height. The 26px middle track is the **column resize handle** (edit mode only): 4×44px gold #C9AF6E bar, cursor col-resize; drag adjusts `r` (clamped 0.25–0.78); double-click swaps the two columns. Each column: flex column, gap 12px, `overflow-y: auto`, `min-width: 0`.

#### Visual card (block type "visual")
White card, radius 16px, border 1px #8798AA, shadow `7px 9px 20px rgba(15,23,42,0.07), 2px 3px 6px rgba(15,23,42,0.04)`, overflow hidden. Flex-grows to fill leftover column height (`flex: 1 1 240px`, min-height 260px) unless a fixed height `h` is set (`flex: 0 0 auto; height: {h}px`).
- **Header strip**: bg #F1F4F7, bottom border #E2E8EF, padding 8px 18px, flex wrap gap 9px. Contents: editable subtitle 10.5px/700 uppercase #2B2B2B (`sub`); "›" 12px #9AA7B4; **"See in dashboard ↗" link chip** (#242424 bg, white 11px/600, padding 4px 11px, radius full, gold ↗ #E8CC70; hover #386B45) — links to the dashboard perspective in `persp`; in edit mode, a small `<select>` of perspectives (Employee Experience / Collaboration / Open Text Insights / Workspace Map / Census) with gold-tinted styling (border #C9AF6E, bg #FFFDF5, text #5A4410); right-aligned **drag grip** "⋮⋮" (cursor grab); in edit mode a 20px "✕" remove button (border #D8B0A8, bg #FBF1EF, text #A2483A; hover inverted).
- **Body**: 12px padding around the image drop-zone (min-height 190px). Prototype uses the `<image-slot>` component (drag-and-drop, contain fit, radius 8) — production: image upload with object-fit contain against white.
- **Caption footer**: bg #FBFCFB, top border #E2E8EF, padding 10px 20px, editable 11px/1.5 #6E7E96.
- **Height handle** (edit mode): 13px strip below the caption (bg #F7F9F8, top border #EDF1EE) with a 44×4px gold bar; drag sets fixed height (clamp 220–1400px); double-click resets to auto-fill.

#### Text card (block type "text")
Radius 14px, padding (grip strip + 4px 18px 14px). Background/border/label/text colors from the 7 presets below. No shadow.
- **Grip strip** at top: centered "⋮⋮⋮" dots (12px, letter-spacing 3px, colored per preset label color), cursor grab, whole strip is the drag handle.
- **Subtitle**: editable, 700 uppercase letter-spacing 0.14em, color = preset label color, font-size from size preset.
- **Body**: editable, color = preset text color, font-size/line-height from size preset.
- **Edit controls row** (edit mode only, margin-top 11px): three "A" size buttons (11px / 14px / 17px, weight 800; active #C99A3C, inactive #9AA7B4), 1px divider, 7 color swatches (17px circles; active ring `0 0 0 2.5px #C99A3C`; the transparent swatch renders as white with a diagonal grey slash), right-aligned "✕" remove.

**Color presets** (bg / border / label / text):
0. `#FFFFFF / #DCE3DD / #6E7E96 / #3B4B63` (white)
1. `#F1F8F3 / #CDE6D5 / #2F9151 / #3B4B63` (green)
2. `#F0F5FA / #D5E2EE / #5E7898 / #3B4B63` (blue)
3. `#FBF5E3 / #EAD9A8 / #8A6A1F / #5A4A28` (gold)
4. `#242424 / #3A3A3A / #E8CC70 / rgba(255,255,255,0.82)` (charcoal)
5. `#3B4B63 / #4C5F7C / #AFC4DC / rgba(255,255,255,0.85)` (slate)
6. `transparent / transparent / #6E7E96 / #3B4B63` (transparent — used by the chrome-less intro paragraph)

**Text size presets** (body px / line-height / subtitle px):
0. 13 / 1.55 / 10 (default) · 1. 19 / 1.45 / 12 · 2. 31 / 1.25 / 14 (matches the slide headline size)

### 3. Persistent chrome (over both cover and slides)
- **Bottom-left cluster**: gold gradient 46px round "+" button + dark pill "Edit narrative" / "Done editing" (bg `rgba(20,28,24,0.94)`, border `rgba(255,255,255,0.1)`, 13px/600). On the cover the "+" adds a **new slide** (label "New chapter", "Draft" pill in gold, starter visual + transparent text block, then navigates to it). On a content slide it opens a menu (same dark pill styling) with "▣ Add new visual" and "¶ Add new text" — new cards are appended to whichever column has fewer cards. Admin-only chrome: gate on the admin role (prototype shows it always).
- **Bottom-center nav pill** (content slides only): dark pill (same treatment) with "← Prev", "Cover", and gold-gradient "Next →" buttons (10px 20px padding each). Next on the last slide returns to cover. Arrow keys also navigate (disabled while editing).
- **Edit-mode toast**: centered above the nav, cream pill (#FFFDF5, border #F0E2B6, 12px #5A4410): "✎ Editing — click text to rewrite · drag cards by their ⋮⋮ grips · gold handles resize · A A A sets text size."

## Interactions & Behavior
- **Edit mode** toggles `contentEditable` on all text (dashed gold outline `rgba(201,154,60,0.55)` offset 3px on editable elements), shows resize handles, swatches, size buttons, remove buttons, perspective selects. Text persists on blur (`innerText` → state).
- **Drag & drop cards**: HTML5 drag from the grips. Drop on another card = insert above it (either column); drop on empty column space = append to that column. Constrained to the two columns — no free placement.
- **Exports** (prototype uses `modern-screenshot` + `jsPDF` from CDN; production can reuse or server-render):
  - Per-slide "⤓" → PNG of that slide (2× scale, landscape as rendered).
  - Cover "Download all" → single PDF: cover + every slide, one landscape page each, walking through the slides sequentially (~450ms per slide for image settling). Button label switches to "Preparing file…".
  - During capture all edit chrome, grips, download and add/edit buttons are hidden (visibility, not display, to preserve layout).
- **Dashboard links**: each visual's "See in dashboard" chip should deep-link to the chosen perspective's dashboard route for the client (prototype uses `href="#"`).
- Hover states are specified inline in the prototype via `style-hover` attributes — read them as `:hover` styles.

## State Management
Single component state: `slide` (0 = cover), `editing`, `menuOpen`, `exporting`, `busyAll`, plus the deck document (`order`, `slides`). All mutations write through to persistence. See the logic class in the prototype HTML for exact handlers (`_dropOn`, `_addSlide`, `_addBlock`, `_updateBlock`, `_startVResize`, `_downloadAll`, …).

## Design Tokens
- Fonts: **Montserrat** (UI, 400–800) + **Playfair Display** (display, 500–700) — already the portal's `--font-sans` / `--font-serif`.
- Brand: charcoal #242424, gold #C99A3C / light gold #E8CC70 / accent #D7B35A, emerald #386B45, greens #2F9151, page #EFF2ED / #E8ECE9, ink #152238, body #3B4B63, muted #6E7E96 / #9AA7B4, borders #DCE3DD / #E2E8EF / #8798AA.
- Radii: cards 14/16px, chips/pills 9999px. Gold handle bars: 4px thick, #C9AF6E.

## Assets
- `assets/CClogo3.png` — Caliber banner logo (already in the portal at `public/CClogo3.png`).
- `assets/caliber-seal.png` — Caliber circular seal (Prepared-by square).
- `assets/dws-logo.png` — Deep Well Services logo (Prepared-for square). In production, source per-client logos from client records.

## Files
- `DWS Insights Readout v1.dc.html` — the full prototype (markup + logic class).
- `image-slot.js` — prototype drop-target web component (reference only; replace with a real uploader).
- `assets/` — logos above.

The portal top banner in the prototype is a recreation of the existing `AppTopBanner` for context — do not rebuild it; mount the readout under the real one.
