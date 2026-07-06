import type { Readout, ReadoutFinding, ReadoutIntro, ReadoutOutro, ReadoutStatus } from "@/types/readout";
import { getFirebaseAdminFirestore } from "./admin";

const READOUTS_COLLECTION = "readouts";

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function mergeById<T extends { id: string }>(existingDocs: T[], defaultDocs: T[]) {
  const merged = new Map(defaultDocs.map((doc) => [doc.id, doc]));
  existingDocs.forEach((doc) => {
    merged.set(doc.id, doc);
  });
  return Array.from(merged.values());
}

function defaultIntro(): ReadoutIntro {
  return {
    executiveName: "",
    executiveRole: "",
    headline: "",
    body: "",
    subHead: "",
    section1Title: "Where we stand",
    section1Body: "",
    section2Title: "Strengths",
    section2Body: "",
    section3Title: "Watch areas",
    section3Body: "",
    section4Title: "So what",
    section4Body: "",
    preparedBy: "Caliber Consulting - Employee Experience Practice",
    dateInfo: "",
  };
}

function defaultOutro(): ReadoutOutro {
  return {
    nsHead: "Next steps",
    nsHero: "",
    step1: "",
    step2: "",
    step3: "",
    teamName: "Employee Experience Practice",
    teamContact: "",
    completeLabel: "Readout complete",
    headline: "",
    body: "",
    priority1Title: "",
    priority1Body: "",
    priority2Title: "",
    priority2Body: "",
    priority3Title: "",
    priority3Body: "",
  };
}

export function defaultReadoutFindings(): ReadoutFinding[] {
  return [
    {
      id: "overview",
      enabled: true,
      order: 1,
      section: "stand",
      tone: "neutral",
      verdict: "Holding steady",
      eyebrow: "Overall favorability",
      headlineShort: "Favorability holds at 68",
      headline: "Favorability is holding at 68 - steady, but not pulling away.",
      detail:
        "1,284 employees responded (71%). Three of the four indexes ticked up versus February, but the overall climb has flattened to under a point a cycle.",
      means:
        "You're stable and slightly positive - no crisis, but no breakout either. The real story is hiding inside the averages, where one or two groups pull against the rest.",
      act: "Use the index and department cuts to find the area dragging the average down before the next pulse.",
      perspGroup: "Executive & HR",
      persp: "Campaign Overview",
      chartTitle: "Index averages",
      chartSub: "Oct 2025 - dashed line = org average 67.7",
      howToRead:
        "Bars are colored on the favorability scale (red low to blue high). The dashed line marks the org-wide average.",
      chartType: "favbars",
      chartData: {
        avg: 67.7,
        axis: { min: 56, max: 80, ticks: [60, 70, 80] },
        items: [
          { label: "Manager", value: 71.1, delta: 0.9 },
          { label: "Engagement", value: 69.0, delta: 0.8 },
          { label: "Culture", value: 66.7, delta: 1.3 },
          { label: "Intent to Stay", value: 64.1, delta: 0.4 },
        ],
      },
    },
    {
      id: "momentum",
      enabled: true,
      order: 2,
      section: "stand",
      tone: "good",
      verdict: "Trending up",
      eyebrow: "Momentum",
      headlineShort: "Steady gains, +1.5",
      headline: "Three campaigns of steady gains - up +1.5 since July 2024.",
      detail:
        "Every index has improved across the last two pulses. The trajectory is real and consistent, but each step is getting a little smaller.",
      means:
        "The culture work of the last year is compounding. The risk now is a plateau: the easy gains are behind you.",
      act: "Protect what is driving the climb and pick one lagging area to headline next pulse.",
      perspGroup: "Executive & HR",
      persp: "Detailed History",
      chartTitle: "Overall favorability over time",
      chartSub: "Jul 2024 to Oct 2025 - faint lines = individual indexes",
      howToRead:
        "The bold line is the org-wide average. The faint lines are the four indexes. Delta compares latest pulse to prior.",
      chartType: "history",
      chartData: null,
    },
    {
      id: "manager",
      enabled: true,
      order: 3,
      section: "strength",
      tone: "good",
      verdict: "Strength",
      eyebrow: "Strength",
      headlineShort: "Manager is strongest at 71",
      headline: "Managers are your strongest asset - and trust runs deep.",
      detail:
        "Manager is the top index at 71. Respect and trust statements anchor the entire employee experience.",
      means: "Frontline management is carrying the experience. Codify and export these behaviors.",
      act: "Capture what strongest managers do and build it into onboarding for weaker teams.",
      perspGroup: "Executive & HR",
      persp: "Detailed Results",
      chartTitle: "Manager statements",
      chartSub: "Oct 2025 - dashed line = index average 71.1",
      howToRead:
        "Each bar is one survey statement within the Manager index. The dashed line is the index average.",
      chartType: "favbars",
      chartData: {
        avg: 71.1,
        axis: { min: 55, max: 88, ticks: [60, 70, 80] },
        items: [
          { label: "Treats me with respect", value: 82.1 },
          { label: "I trust my manager", value: 76.4 },
          { label: "Cares about me as a person", value: 75.0 },
          { label: "Communicates clearly", value: 70.2 },
          { label: "Removes obstacles to my work", value: 68.5 },
          { label: "Recognizes my contributions", value: 67.9 },
          { label: "Gives me useful feedback", value: 65.8 },
          { label: "Helps me grow & develop", value: 63.2 },
        ],
      },
    },
    {
      id: "intent",
      enabled: true,
      order: 4,
      section: "watch",
      tone: "risk",
      verdict: "Watch",
      eyebrow: "Watch area",
      headlineShort: "Intent to Stay lags at 64",
      headline: "Intent to Stay is the soft spot - retention risk is quietly building.",
      detail:
        "At 64, Intent to Stay is the lowest index. Career path clarity and turning down outside offers are the weakest statements.",
      means: "People are engaged now but uncertain about tomorrow. Career path is the leading lever.",
      act: "Make growth paths visible this quarter, especially for high performers.",
      perspGroup: "Executive & HR",
      persp: "Detailed Results",
      chartTitle: "Intent to Stay statements",
      chartSub: "Oct 2025 - dashed line = index average 64.1",
      howToRead:
        "Each bar is one statement within Intent to Stay. Lowest bars highlight where retention risk concentrates.",
      chartType: "favbars",
      chartData: {
        avg: 64.1,
        axis: { min: 50, max: 82, ticks: [55, 65, 75] },
        items: [
          { label: "Expect to be here in 2 years", value: 74.6 },
          { label: "My future here looks bright", value: 69.3 },
          { label: "Good reasons to stay", value: 66.1 },
          { label: "Clear path to grow my career", value: 60.2 },
          { label: "Rarely think about leaving", value: 58.9 },
          { label: "Would turn down an offer elsewhere", value: 55.7 },
        ],
      },
    },
    {
      id: "pcs",
      enabled: true,
      order: 5,
      section: "watch",
      tone: "risk",
      verdict: "Urgent",
      eyebrow: "Team to support",
      headlineShort: "PCS dropped 7.7 points",
      headline: "Production Control & Sourcing is falling behind - fast.",
      detail:
        "PCS is at 41 against an org average of 68, and it is the only team moving backward year over year.",
      means: "One team is diverging from the company and dragging the overall average down.",
      act: "Treat PCS as a standalone intervention now with focused leadership listening sessions.",
      perspGroup: "Executive & HR",
      persp: "Job / Department Comparison",
      chartTitle: "Favorability by department",
      chartSub: "Oct 2025 - dashed line = org average 67.7 - delta vs last year",
      howToRead:
        "Each bar is department favorability; chip shows change since last year. PCS is below average and declining.",
      chartType: "favbars",
      chartData: {
        avg: 67.7,
        highlight: "Production Control & Sourcing",
        axis: { min: 35, max: 90, ticks: [40, 55, 70, 85] },
        items: [
          { label: "IT", value: 84.2, delta: 6.0 },
          { label: "Production", value: 72.6, delta: 4.0 },
          { label: "Sales", value: 70.1, delta: 8.3 },
          { label: "Shipping & Receiving", value: 67.4, delta: 2.1 },
          { label: "Customer Service", value: 66.8, delta: 1.5 },
          { label: "Accounting", value: 58.3, delta: 5.5 },
          { label: "Production Control & Sourcing", value: 41.0, delta: -7.7 },
        ],
      },
    },
    {
      id: "action",
      enabled: true,
      order: 6,
      section: "sowhat",
      tone: "neutral",
      verdict: "Make the call",
      eyebrow: "So what - next 90 days",
      headlineShort: "Three moves to make now",
      headline: "Three moves before the next pulse.",
      detail:
        "If leadership does nothing else this quarter, these are the highest-leverage actions the data points to.",
      means: null,
      act: null,
      perspGroup: "Executive & HR",
      persp: "Campaign Overview",
      chartTitle: "Recommended priorities",
      chartSub: "Ranked by leverage x winnability",
      howToRead:
        "These priorities map directly to the findings and link back to the supporting perspective detail.",
      chartType: "actions",
      chartData: {
        items: [
          {
            title: "Stabilize Production Control & Sourcing",
            tone: "risk",
            detail:
              "Down 7.7 and below every other team - the most urgent, and most winnable, intervention.",
          },
          {
            title: "Protect what managers are doing right",
            tone: "good",
            detail:
              "Manager trust is the engine of the experience. Codify it before scaling to weaker teams.",
          },
          {
            title: "Get ahead of retention",
            tone: "risk",
            detail:
              "Intent to Stay is the soft spot; career-path clarity scores lowest. Make growth visible now.",
          },
        ],
      },
    },
  ];
}

export function buildDefaultReadouts(): Readout[] {
  return [];
}

export async function getFirebaseReadouts() {
  try {
    const defaults = buildDefaultReadouts();
    const snapshot = await getFirebaseAdminFirestore().collection(READOUTS_COLLECTION).get();

    if (snapshot.empty) {
      return defaults;
    }

    const docs = snapshot.docs.map((doc) => doc.data() as Readout);
    return mergeById(docs, defaults);
  } catch (error) {
    console.error("Failed to read Firebase readouts; falling back to defaults.", error);
    return buildDefaultReadouts();
  }
}

export async function getFirebaseReadoutById(readoutId: string) {
  const readouts = await getFirebaseReadouts();
  return readouts.find((readout) => readout.id === readoutId) ?? null;
}

export async function getFirebaseReadoutsByClientId(clientId: string) {
  const readouts = await getFirebaseReadouts();
  return readouts
    .filter((readout) => readout.clientId === clientId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getPublishedFirebaseReadoutForClient(clientId: string) {
  const readouts = await getFirebaseReadoutsByClientId(clientId);
  return readouts.find((readout) => readout.status === "published") ?? null;
}

interface CreateFirebaseReadoutInput {
  clientId: string;
  campaignId?: string | null;
  surveyWaveLabel?: string | null;
  name: string;
  createdBy: string;
}

interface UpdateFirebaseReadoutInput {
  readoutId: string;
  campaignId?: string | null;
  surveyWaveLabel?: string | null;
  name?: string;
  status?: ReadoutStatus;
  intro?: Partial<ReadoutIntro>;
  findings?: ReadoutFinding[];
  outro?: Partial<ReadoutOutro>;
}

export async function createFirebaseReadout(input: CreateFirebaseReadoutInput) {
  const timestamp = nowIso();
  const baseId = `${slugify(input.name)}-${slugify(input.clientId)}`;
  const readoutId = `${baseId}-${timestamp.slice(0, 10)}`;

  const readout: Readout = {
    id: readoutId,
    clientId: input.clientId,
    campaignId: input.campaignId?.trim() || null,
    surveyWaveLabel: input.surveyWaveLabel?.trim() || null,
    name: input.name.trim(),
    status: "draft",
    intro: defaultIntro(),
    findings: defaultReadoutFindings(),
    outro: defaultOutro(),
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: null,
    createdBy: input.createdBy,
  };

  await getFirebaseAdminFirestore()
    .collection(READOUTS_COLLECTION)
    .doc(readout.id)
    .set(readout, { merge: true });

  return readout;
}

export async function updateFirebaseReadout(input: UpdateFirebaseReadoutInput) {
  const existingReadout = await getFirebaseReadoutById(input.readoutId);

  if (!existingReadout) {
    throw new Error("Readout not found.");
  }

  const updatedReadout: Readout = {
    ...existingReadout,
    campaignId:
      input.campaignId !== undefined ? input.campaignId?.trim() || null : existingReadout.campaignId,
    surveyWaveLabel:
      input.surveyWaveLabel !== undefined
        ? input.surveyWaveLabel?.trim() || null
        : existingReadout.surveyWaveLabel,
    name: input.name?.trim() || existingReadout.name,
    status: input.status ?? existingReadout.status,
    intro: input.intro ? { ...existingReadout.intro, ...input.intro } : existingReadout.intro,
    findings: input.findings ?? existingReadout.findings,
    outro: input.outro ? { ...existingReadout.outro, ...input.outro } : existingReadout.outro,
    updatedAt: nowIso(),
  };

  await getFirebaseAdminFirestore()
    .collection(READOUTS_COLLECTION)
    .doc(existingReadout.id)
    .set(updatedReadout, { merge: true });

  return updatedReadout;
}

export async function publishFirebaseReadout(readoutId: string) {
  const readout = await getFirebaseReadoutById(readoutId);

  if (!readout) {
    throw new Error("Readout not found.");
  }

  const introConfigured = Boolean(readout.intro.headline.trim() && readout.intro.body.trim());
  const outroConfigured = Boolean(readout.outro.headline.trim());
  const enabledFindings = readout.findings.filter((finding) => finding.enabled).length;

  if (!introConfigured || !outroConfigured || enabledFindings < 1) {
    throw new Error("Readout is not ready to publish.");
  }

  const timestamp = nowIso();
  const existingReadouts = await getFirebaseReadoutsByClientId(readout.clientId);
  const firestore = getFirebaseAdminFirestore();
  const batch = firestore.batch();

  existingReadouts.forEach((existing) => {
    if (existing.id === readout.id || existing.status !== "published") {
      return;
    }

    batch.set(
      firestore.collection(READOUTS_COLLECTION).doc(existing.id),
      {
        status: "inactive",
        updatedAt: timestamp,
      } satisfies Partial<Readout>,
      { merge: true }
    );
  });

  const publishedReadout: Readout = {
    ...readout,
    status: "published",
    publishedAt: timestamp,
    updatedAt: timestamp,
  };

  batch.set(firestore.collection(READOUTS_COLLECTION).doc(readout.id), publishedReadout, {
    merge: true,
  });

  await batch.commit();

  return publishedReadout;
}

export async function deleteFirebaseReadout(readoutId: string) {
  await getFirebaseAdminFirestore().collection(READOUTS_COLLECTION).doc(readoutId).delete();
}
