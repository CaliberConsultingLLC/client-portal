import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function initAdmin() {
  if (getApps().length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE_* env. Run with: node --env-file=.env.local scripts/tf-readout-author.mjs");
  }
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

initAdmin();
const db = getFirestore();
db.settings({ preferRest: true });

const READOUT_ID = "tf-insights-readout-tf-2026-07-10";

const PILL = {
  green: { pillBg: "#E7F2EB", pillFg: "#2F9151", dot: "#2F9151" },
  gold: { pillBg: "#FBF5E3", pillFg: "#8A6A1F", dot: "#C99A3C" },
  blue: { pillBg: "#E9F0F7", pillFg: "#5E7898", dot: "#5E7898" },
};
const ACCENT = { green: "#2F9151", blue: "#5E7898", gold: "#C99A3C", red: "#C96B60" };

const link = (perspectiveId) => ({
  assetId: "tf-collaboration",
  href: "/portal/dashboards/tf-collaboration",
  family: "collaboration",
  perspectiveId,
});

// Standard slide: insights (datapoints + read + next) on the left, visual right.
function insightSlide({ key, label, pill, accent, headline, blurb, perspectiveId, visualSub, visualCaption, dp, read, next }) {
  const v = `v-${key}`;
  const d1 = `d1-${key}`;
  const d2 = `d2-${key}`;
  const rd = `r-${key}`;
  const nx = `n-${key}`;
  return [
    key,
    {
      label,
      pill: pill.text,
      pillBg: PILL[pill.color].pillBg,
      pillFg: PILL[pill.color].pillFg,
      dot: PILL[pill.color].dot,
      headline,
      blurb,
      focusAccent: ACCENT[accent],
      dashboardLink: link(perspectiveId),
      r: 0.46,
      colCount: 2,
      widths: [0.46, 0.54],
      cols: { a: [d1, d2, rd, nx], b: [v], c: [], d: [] },
      blocks: {
        [v]: { type: "visual", slot: `${key}-visual`, sub: visualSub, persp: "Collaboration", caption: visualCaption, imageUrl: null },
        [d1]: { type: "datapoint", value: dp[0].value, subtitle: dp[0].subtitle, color: dp[0].color, size: 2, w: 0.5 },
        [d2]: { type: "datapoint", value: dp[1].value, subtitle: dp[1].subtitle, color: dp[1].color, size: 2, w: 0.5 },
        [rd]: { type: "text", color: 0, subtitle: "The read", body: read },
        [nx]: { type: "text", color: 1, subtitle: "Do this next", body: next },
      },
    },
  ];
}

const sc1 = insightSlide({
  key: "sc1",
  label: "Where we stand",
  pill: { color: "green", text: "Baseline set" },
  accent: "blue",
  headline: "A healthy starting line: collaboration sits at 71 out of 100.",
  blurb: "The first company-wide read on how departments work together.",
  perspectiveId: "overview",
  visualSub: "Collaboration overview",
  visualCaption: "Overall score with incoming vs. outgoing averages — captured from the Overview tab.",
  dp: [
    { value: "71.4", subtitle: "OVERALL COLLABORATION · 0–100", color: 5 },
    { value: "47", subtitle: "RESPONDENTS · 8 DEPARTMENTS", color: 4 },
  ],
  read:
    "This is the first time Top Flight has measured how its departments actually experience working together — 47 people across 8 departments, plus 114 open comments. How teams are seen (71.3) and how they see others (71.4) land almost identically: a balanced, credible baseline, not a crisis. The average hides a 19-point spread, though — from 81 at the top to 62 at the bottom.",
  next:
    "Treat 71 as the number to beat. Re-run the same questions next wave so this becomes a trend line you can manage to, not a one-time snapshot.",
});

const sc2 = insightSlide({
  key: "sc2",
  label: "The pattern",
  pill: { color: "gold", text: "Themes, not alarms" },
  accent: "gold",
  headline: "The willingness is there. The early information isn't.",
  blurb: "One collaboration pattern repeats in every department.",
  perspectiveId: "ci",
  visualSub: "Collaboration Index — statements",
  visualCaption: "The nine collaboration statements, org-wide — captured from the CI tab.",
  dp: [
    { value: "70.7", subtitle: "TOP THEME · SOLVES SHARED PROBLEMS", color: 1 },
    { value: "59.2", subtitle: "WEAKEST · KEEPS PARTNERS INFORMED", color: 3 },
  ],
  read:
    "Across all nine collaboration questions — and in every single department — the shape is the same. Teams rate each other highest on willingness to solve shared problems (70.7) and responsiveness (67.3). The two lowest, everywhere, are about proactive information: keeping partners informed on decisions (59.2) and giving early enough updates to plan (59.4). This is goodwill without information flow — a cadence problem, not an attitude problem.",
  next:
    "Set one simple cross-department standard for who needs to know, and when — especially before a decision lands on another team.",
});

const sc3 = insightSlide({
  key: "sc3",
  label: "The map",
  pill: { color: "blue", text: "Relationships" },
  accent: "green",
  headline: "A strong service spine, a few frayed seams, one one-way street.",
  blurb: "Which relationships carry the business — and which need repair.",
  perspectiveId: "cdrs-heatmap",
  visualSub: "CDRS heatmap",
  visualCaption: "Department-to-department ratings — captured from the CDRS Heatmap tab.",
  dp: [
    { value: "90", subtitle: "STRONGEST PAIR · CUST. SERVICE ↔ SHIPPING", color: 1 },
    { value: "40", subtitle: "WIDEST GAP · ACCOUNTING ↔ PC&S", color: 3 },
  ],
  read:
    "The fulfillment core is Top Flight's strength — Customer Service, Shipping & Receiving, and Accounting rate one another 85–90. The weakest seams cluster around the Production Floor's outward links (about 62 with Sales and Customer Service). The most striking signal is asymmetry: everyone rates Accounting highly (81 incoming), but Accounting rates several partners far lower — it scores Production Control & Sourcing a 47 while they rate Accounting an 88, with a similar one-way gap toward Sales.",
  next:
    "Make the strongest pairs the model for how teams work together, and open a direct, two-way conversation on the Accounting–PC&S and Accounting–Sales seams.",
});

const sc4 = insightSlide({
  key: "sc4",
  label: "Where to focus",
  pill: { color: "gold", text: "Model vs. invest" },
  accent: "blue",
  headline: "Two teams to model, two to invest in.",
  blurb: "The department hierarchy, by how others experience each team.",
  perspectiveId: "department-360",
  visualSub: "Department 360",
  visualCaption: "Incoming, outgoing, gap and collaboration index per team — captured from the Dept 360 tab.",
  dp: [
    { value: "82.7", subtitle: "MODEL · ACCOUNTING (CI)", color: 1 },
    { value: "49.1", subtitle: "INVEST · PRODUCT DEVELOPMENT (CI)", color: 3 },
  ],
  read:
    "Ranked by how others experience them, Accounting (81 incoming / 83 CI) and Customer Service (77 / 77) are the teams worth codifying and copying. At the other end, Product Development is the hardest to work with (CI 49 — the lowest, even though it rates others generously), and IT is lowest on how it is experienced (62 incoming / 54 CI). Both are small teams carrying heavy cross-functional load — these are investment areas, not indictments.",
  next:
    "Pair each focus team with an anchor team, and have Accounting and Customer Service share what makes them easy to work with.",
});

// Closing synthesis slide — no visual.
const sc5 = [
  "sc5",
  {
    label: "So what",
    pill: "Next steps",
    pillBg: PILL.green.pillBg,
    pillFg: PILL.green.pillFg,
    dot: PILL.green.dot,
    headline: "Four moves before the next wave.",
    blurb: "The highest-leverage actions the data points to.",
    focusAccent: ACCENT.green,
    dashboardLink: link("executive-summary"),
    r: 0.5,
    colCount: 2,
    widths: [0.5, 0.5],
    cols: { a: ["story-sc5", "dp-sc5"], b: ["moves-sc5", "conf-sc5"], c: [], d: [] },
    blocks: {
      "story-sc5": {
        type: "text",
        color: 5,
        size: 1,
        subtitle: "The story in one line",
        body: "Top Flight collaborates on goodwill. The opportunity is turning that goodwill into disciplined, early information-sharing — and repairing a few specific seams between otherwise healthy teams.",
      },
      "dp-sc5": {
        type: "datapoint",
        value: "71.4",
        subtitle: "THE BASELINE TO BEAT · 0–100",
        color: 4,
        size: 2,
        w: 1,
      },
      "moves-sc5": {
        type: "text",
        color: 1,
        subtitle: "Four moves",
        body: "1 · Lock 71 as the baseline and re-measure next wave on the same questions.\n2 · Launch a cross-department information-cadence standard — the weak spot in every team.\n3 · Run three named relationship resets: Accounting–PC&S, Accounting–Sales, and Production Floor–Sales.\n4 · Have your anchor teams (Accounting, Customer Service) teach what makes them easy partners.",
      },
      "conf-sc5": {
        type: "text",
        color: 3,
        subtitle: "Where the data is thin",
        body: "A few teams had very few respondents (IT 1, Product Development 2, Customer Service 3, Sales 4). Treat those team-level reads as directional and grow participation next wave. Org-level findings and well-covered teams — like the Production Floor at 18 responses — are solid.",
      },
    },
  },
];

// Clone the existing TF readout as a base so all required fields (intro,
// findings, outro, clientId) stay valid — then write a BRAND-NEW doc so the
// user's original "Insights Readout" is never touched.
const baseSnap = await db.collection("readouts").doc(READOUT_ID).get();
if (!baseSnap.exists) throw new Error(`Base readout not found: ${READOUT_ID}`);
const base = baseSnap.data();
const cover = base.deck?.cover ?? {};

const newDeck = {
  waveLabel: base.deck?.waveLabel ?? "May 2026",
  cover: {
    ...cover,
    body:
      "Top Flight's first look at how departments actually experience working with one another. Five chapters, one story: where you stand, the pattern beneath the scores, the relationships that carry the business, the teams to model and support, and the moves to make before the next wave.",
    closingBody:
      "The priorities on the final slide are a starting point — we'll pressure-test and sequence them together in your debrief.",
  },
  order: ["sc1", "sc2", "sc3", "sc4", "sc5"],
  slides: Object.fromEntries([sc1, sc2, sc3, sc4, sc5]),
};

const now = new Date().toISOString();
const NEW_ID = "collaboration-insights-draft-tf-2026-07-20";
const NEW_NAME = "Collaboration Insights (Draft)";

const newReadout = {
  ...base,
  id: NEW_ID,
  name: NEW_NAME,
  status: "draft",
  publishedAt: null,
  deck: newDeck,
  createdAt: now,
  updatedAt: now,
};

await db.collection("readouts").doc(NEW_ID).set(newReadout, { merge: false });

console.log("Created NEW readout:", NEW_ID);
console.log("Name:", NEW_NAME, "| client:", newReadout.clientId, "| status:", newReadout.status);
console.log("Slides:", newDeck.order.join(", "));
process.exit(0);
