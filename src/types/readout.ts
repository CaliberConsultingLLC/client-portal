export type ReadoutStatus = "draft" | "published" | "inactive";
/** Who among the client workspace can open a published readout. */
export type ReadoutAccessMode = "all_client_users" | "selected_users";
export type ReadoutFindingSection = "stand" | "strength" | "watch" | "sowhat";
export type ReadoutFindingTone = "good" | "risk" | "neutral";
export type ReadoutTextSize = 0 | 1 | 2 | 3;

export interface ReadoutIntro {
  executiveName: string;
  executiveRole: string;
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
}

export interface ReadoutOutro {
  nsHead: string;
  nsHero: string;
  step1: string;
  step2: string;
  step3: string;
  teamName: string;
  teamContact: string;
  completeLabel: string;
  headline: string;
  body: string;
  priority1Title: string;
  priority1Body: string;
  priority2Title: string;
  priority2Body: string;
  priority3Title: string;
  priority3Body: string;
}

export interface ReadoutFinding {
  id: string;
  enabled: boolean;
  order: number;
  section: ReadoutFindingSection;
  tone: ReadoutFindingTone;
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
  /** Optional link to the dashboard instance this readout summarizes. */
  dashboardInstanceId?: string | null;
  /** Perspective/renderer key for live chart sync (e.g. campaign-overview). */
  perspectiveKey?: string | null;
  chartType?: "favbars" | "history" | "actions";
  chartData?: Record<string, unknown> | null;
}

export type ReadoutVisualBlock = {
  type: "visual";
  slot: string;
  sub: string;
  persp: string;
  caption: string;
  h?: number | null;
  /** Width as a fraction of the column (0.22–1). Null/undefined = full column width. */
  w?: number | null;
  imageUrl?: string | null;
};

export type ReadoutTextBlock = {
  type: "text";
  color: number;
  size?: 0 | 1 | 2;
  subtitle: string;
  body: string;
};

export type ReadoutDataPointBlock = {
  type: "datapoint";
  color: number;
  size?: ReadoutTextSize;
  value: string;
  subtitle: string;
  /** Fixed card height in px. Null/undefined = content height. */
  h?: number | null;
  /** Width as a fraction of the column (0.22–1). Null/undefined = full column width. */
  w?: number | null;
};

export type ReadoutBlock = ReadoutVisualBlock | ReadoutTextBlock | ReadoutDataPointBlock;

export type ReadoutColKey = "a" | "b" | "c" | "d";
export type ReadoutColCount = 2 | 3 | 4;

/** Deep-link target for a slide's "See in dashboard" button. */
export type ReadoutDashboardLink = {
  /** Portal dashboard asset id (preferred). */
  assetId?: string | null;
  /** Full portal href for the selected dashboard. */
  href?: string | null;
  /** Dashboard family from the selected instance. */
  family?: "employee_experience" | "collaboration" | "integration" | null;
  /** @deprecated Prefer assetId/family from the client dashboard list. */
  product?:
    | "employee-experience"
    | "collaboration"
    | "workspace-map"
    | "census"
    | null;
  /** Perspective / tab id within the selected dashboard. */
  perspectiveId?: string | null;
  campaign?: string | null;
  prior?: string | null;
  location?: string | null;
  department?: string | null;
  /** Index / dimension name. */
  index?: string | null;
  brand?: string | null;
  supervisor?: string | null;
};

export type ReadoutSlideCols = {
  a: string[];
  b: string[];
  c: string[];
  d: string[];
};

/** One block placed in a row, spanning `span` of the slide's columns. */
export type ReadoutRowItem = {
  blockId: string;
  /** Columns this block occupies (1..colCount). Spans in a row sum to <= colCount. */
  span: number;
};

/** A horizontal band of blocks. Rows stack top-to-bottom down the slide. */
export type ReadoutRow = {
  id: string;
  items: ReadoutRowItem[];
};

export type ReadoutSlide = {
  label: string;
  pill: string;
  pillBg: string;
  pillFg: string;
  dot: string;
  headline: string;
  blurb: string;
  /** Cover focus-card accent (Roman numeral + border). */
  focusAccent?: string | null;
  /** Where the slide "See in dashboard" button opens (perspective + filters). */
  dashboardLink?: ReadoutDashboardLink | null;
  /** Two-column left fraction (kept in sync with widths[0] when colCount === 2). */
  r: number;
  /** Active column count for this slide. */
  colCount?: ReadoutColCount;
  /** Relative column widths (length = colCount). */
  widths?: number[];
  /**
   * Row-based layout (current). Any block may span multiple columns.
   * Migrated from `cols` on first load — see `normalizeReadoutDeck`.
   */
  rows?: ReadoutRow[];
  /**
   * @deprecated Legacy independent column stacks. Retained alongside `rows`
   * as a rollback path; no longer read for rendering once `rows` exists.
   */
  cols: ReadoutSlideCols;
  blocks: Record<string, ReadoutBlock>;
};

export type ReadoutCover = {
  preparedForName: string;
  preparedByName: string;
  /** Optional client logo for the Prepared-for block. Falls back to client default. */
  logoUrl?: string | null;
  headline: string;
  body: string;
  agendaSubhead: string;
  closingTitle: string;
  closingBody: string;
  /** Closing focus-card accent (Roman numeral + border). */
  closingAccent?: string | null;
};

export type ReadoutDeck = {
  waveLabel: string;
  cover: ReadoutCover;
  order: string[];
  slides: Record<string, ReadoutSlide>;
};

export interface Readout {
  id: string;
  clientId: string;
  campaignId?: string | null;
  /** Survey wave label from CSV analytics data (e.g. June 2026). */
  surveyWaveLabel?: string | null;
  name: string;
  status: ReadoutStatus;
  /**
   * Client visibility ACL. Ignored for internal admins.
   * Missing/legacy docs behave as all_client_users.
   */
  accessMode?: ReadoutAccessMode;
  /** Firebase Auth UIDs allowed when accessMode is selected_users. */
  allowedUserIds?: string[];
  intro: ReadoutIntro;
  findings: ReadoutFinding[];
  outro: ReadoutOutro;
  /** Slide-based insights deck (cover + content slides). */
  deck?: ReadoutDeck | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  createdBy: string;
}
