export type ReadoutStatus = "draft" | "published" | "inactive";
export type ReadoutFindingSection = "stand" | "strength" | "watch" | "sowhat";
export type ReadoutFindingTone = "good" | "risk" | "neutral";

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

export interface Readout {
  id: string;
  clientId: string;
  campaignId?: string | null;
  /** Survey wave label from CSV analytics data (e.g. June 2026). */
  surveyWaveLabel?: string | null;
  name: string;
  status: ReadoutStatus;
  intro: ReadoutIntro;
  findings: ReadoutFinding[];
  outro: ReadoutOutro;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  createdBy: string;
}
