import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Authors the TSi Sep 2026 Employee Experience readout as a NEW draft. The
// existing TSi "Insights Readout" is used only as a base for required fields.
//
// Data note: in the Jun 2025 and Feb 2026 TSi files, roughly 16 statement
// columns are misaligned (e.g. the compensation column tracks the manager
// questions). Statement-level figures here therefore compare only the clean
// waves — Jul 2024, Mar 2025 and Sep 2026. Overall and role-level scores
// average every statement, so they are unaffected and use all six waves.

function initAdmin() {
  if (getApps().length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE_* env. Run with: node --env-file=.env.local scripts/tsi-readout-author.mjs");
  }
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

initAdmin();
const db = getFirestore();
db.settings({ preferRest: true });

const BASE_READOUT_ID = "tsi-insights-readout-tsi-2026-07-10";
const NEW_ID = "tsi-ee-insights-sep-2026";
const NEW_NAME = "Sep 2026 Insights Readout (Draft)";

const PILL = {
  green: { pillBg: "#E7F2EB", pillFg: "#2F9151", dot: "#2F9151" },
  gold: { pillBg: "#FBF5E3", pillFg: "#8A6A1F", dot: "#C99A3C" },
  blue: { pillBg: "#E9F0F7", pillFg: "#5E7898", dot: "#5E7898" },
};
const ACCENT = { green: "#2F9151", blue: "#5E7898", gold: "#C99A3C", red: "#C96B60" };

// Prior is Mar 2025 (the last clean wave) so "See in dashboard" never opens on
// the misaligned Feb 2026 statements.
const link = (perspectiveId) => ({
  assetId: "employee-experience--tsi",
  href: "/portal/dashboards/employee-experience--tsi",
  family: "employee_experience",
  perspectiveId,
  campaign: "Sep 2026",
  prior: "Mar 2025",
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
        [v]: { type: "visual", slot: `${key}-visual`, sub: visualSub, persp: "Employee Experience", caption: visualCaption, imageUrl: null },
        [d1]: { type: "datapoint", value: dp[0].value, subtitle: dp[0].subtitle, color: dp[0].color, size: 2, w: 0.5 },
        [d2]: { type: "datapoint", value: dp[1].value, subtitle: dp[1].subtitle, color: dp[1].color, size: 2, w: 0.5 },
        [rd]: { type: "text", color: 0, subtitle: "The read", body: read },
        [nx]: { type: "text", color: 1, subtitle: "Do this next", body: next },
      },
    },
  ];
}

const s1 = insightSlide({
  key: "s1",
  label: "Where we stand",
  pill: { color: "blue", text: "Steady, softening" },
  accent: "blue",
  headline: "Six surveys in, TSi holds a strong 7.9 — with a gentle slope worth getting ahead of.",
  blurb: "Two-plus years of employee experience, in one line.",
  perspectiveId: "ee-historical-report",
  visualSub: "Score over time",
  visualCaption: "Overall score across all six surveys, Jul 2024 to Sep 2026 — captured from Detailed History.",
  dp: [
    { value: "7.87", subtitle: "OVERALL · SEP 2026 · 0–10 SCALE", color: 4 },
    { value: "413", subtitle: "RESPONSES · MOST OF ANY SURVEY", color: 5 },
  ],
  read:
    "Across six surveys since July 2024, TSi's overall score has stayed in a tight band, 7.87 to 8.08. That consistency is an asset. This round sits at the low end of the band, 0.21 below the June 2025 high, and the softening is concentrated: Culture is now the lowest index (7.50), and the lowest single items are about strain: work-life balance (6.87), manageable stress (6.89) and compensation and benefits (6.59). Pride in being an employee-owner remains high at 8.73.",
  next:
    "Treat this as an early signal, not a verdict. The next four slides show where the slope is coming from, and the strength TSi can use to turn it.",
});

const s2 = insightSlide({
  key: "s2",
  label: "The anchor",
  pill: { color: "green", text: "Strength" },
  accent: "green",
  headline: "The relationship between employees and their direct manager is TSi's strongest asset.",
  blurb: "What is holding firm while other scores move.",
  perspectiveId: "ee-campaign-results",
  visualSub: "Index results",
  visualCaption: "Five index scores for Sep 2026, Manager index highest — captured from Detailed Results.",
  dp: [
    { value: "8.44", subtitle: "MANAGER INDEX · HIGHEST OF FIVE", color: 1 },
    { value: "8.63", subtitle: "MY MANAGER TREATS OUR TEAM FAIRLY & WITH RESPECT", color: 1 },
  ],
  read:
    "Of the five indexes, the questions about an employee's own manager score highest: 8.44 overall and 8.43 among individual contributors. Fair and respectful treatment (8.63), a safe work environment (8.71) and living TSi's values (8.71) are at or near their highest levels, and steady against March 2025. Whatever else is shifting, the day-to-day relationship between employees and the person they report to is intact.",
  next:
    "Use this channel. Direct managers are the most trusted messengers TSi has, so they should carry the follow-up from this survey to their teams, with the talking points and support to do it well.",
});

const s3 = insightSlide({
  key: "s3",
  label: "The managers",
  pill: { color: "gold", text: "Support the middle" },
  accent: "gold",
  headline: "The people leading teams are the ones feeling most stretched.",
  blurb: "How respondents in manager roles experience TSi right now.",
  perspectiveId: "ee-role-comparison",
  visualSub: "Role comparison",
  visualCaption: "IC, Manager and Leadership scores side by side — captured from Role Comparison.",
  dp: [
    { value: "7.61", subtitle: "MANAGERS · OVERALL · FROM 8.11 IN JUN 2025", color: 3 },
    { value: "5.40", subtitle: "MANAGERS · WORK-LIFE BALANCE · ICs 7.00", color: 3 },
  ],
  read:
    "Respondents in manager roles have moved from 8.11 in June 2025 to 7.61 today. That now puts them below individual contributors (7.86) and well below senior leadership (8.78). The drop is specific, not general. Compared with July 2024, managers report lower work-life balance (6.74 to 5.40), less manageable stress (6.74 to 5.74), less training for their responsibilities (7.94 to 6.49) and fewer of the resources they need to hit their goals (7.82 to 6.77). Their pride in TSi (8.68) and their view of their own manager (8.21) remain solid. This reads as capacity, not commitment.",
  next:
    "Before the next survey, hold a managers-only conversation about workload and support: what is on their plate, what they have been equipped for, and the one change that would give them time back.",
});

const s4 = insightSlide({
  key: "s4",
  label: "Department momentum",
  pill: { color: "blue", text: "Momentum varies" },
  accent: "blue",
  headline: "Some teams are climbing. A few have stalled — and the data shows where.",
  blurb: "Department / region trends across six surveys.",
  perspectiveId: "ee-department-comparison",
  visualSub: "Department comparison",
  visualCaption: "Department / region scores for Sep 2026 with change vs. the comparison survey — captured from Department Comparison.",
  dp: [
    { value: "+0.56", subtitle: "EASTERN · SINCE JUL 2024 · NOW 8.41", color: 1 },
    { value: "−0.93", subtitle: "SOUTHERN · SINCE JUL 2024 · NOW 7.33", color: 3 },
  ],
  read:
    "Eastern has climbed steadily to 8.41, now one of the highest-scoring regions, and AM-Sales posted its best score yet (7.53). Three groups have not shared that momentum. Southern held near 8.2 through June 2025, then declined in each of the last two surveys to 7.33, while participation fell from 85 to 39. Corporate, the largest group, has eased in each of the last two surveys (8.32 to 7.93), with its lowest items being cross-team cooperation (6.40) and honest communication and follow-through (6.51). Western has stayed between 7.5 and 7.9 across all six surveys without lasting growth, and its lowest item is work-life balance (6.07).",
  next:
    "Ask Eastern what changed, then bring one focused question to each of Southern, Corporate and Western. In Southern, start with participation: who stopped responding matters as much as what the rest said.",
});

const s5 = insightSlide({
  key: "s5",
  label: "Leadership visibility",
  pill: { color: "gold", text: "Close the distance" },
  accent: "gold",
  headline: "The closer the leader, the higher the score. The opportunity is visibility from the top.",
  blurb: "Which aspects of leadership employees feel, and which they don't see.",
  perspectiveId: "ee-historical-report",
  visualSub: "Culture index history",
  visualCaption: "Culture statements over time, with the leadership-team items highlighted — captured from Detailed History.",
  dp: [
    { value: "7.66", subtitle: "LEADERSHIP TEAM DEMONSTRATES TSi VALUES · FROM 8.23", color: 3 },
    { value: "8.71", subtitle: "MY MANAGER UPHOLDS TSi VALUES", color: 1 },
  ],
  read:
    "Employees give their own manager high marks for living TSi's values (8.71). They are less certain they see it from the leadership team: that measure has moved from 8.23 in July 2024 to 7.66 today. 'The leadership team understands and appreciates the work employee-owners do' has moved from 7.73 to 7.29, and honest communication and follow-through (7.07) is now the lowest culture item. This does not say leadership's values have changed. It says fewer employees are seeing them firsthand. The gap is widest in Southern (5.64 on feeling appreciated by leadership) and Support–Pro Services (7.04).",
  next:
    "Make appreciation visible: leadership-team site visits or skip-level conversations starting in Southern and Support–Pro Services, plus a 'you said, we did' close-out on this survey so follow-through is seen, not assumed.",
});

const baseSnap = await db.collection("readouts").doc(BASE_READOUT_ID).get();
if (!baseSnap.exists) throw new Error(`Base readout not found: ${BASE_READOUT_ID}`);
const base = baseSnap.data();
const cover = base.deck?.cover ?? {};

const existing = await db.collection("readouts").doc(NEW_ID).get();
const now = new Date().toISOString();

const newDeck = {
  waveLabel: "Sep 2026",
  cover: {
    ...cover,
    preparedForName: "Tech Systems, Inc.",
    preparedByName: cover.preparedByName ?? "Dustin Goeglein",
    headline: "Tech Systems, Inc.\nEmployee Experience · Sep 2026",
    body:
      "What six surveys and 2,200+ responses say about the employee experience at TSi. Five conversations: where you stand, the strength to build on, the managers carrying the most, where department momentum has stalled, and how leadership shows up.",
    agendaSubhead: "Five conversations the September data opens up.",
    closingTitle: "What happens next",
    closingBody:
      "These are conversation starters, not conclusions. We'll pressure-test them together in your debrief and choose where to start.",
  },
  order: ["s1", "s2", "s3", "s4", "s5"],
  slides: Object.fromEntries([s1, s2, s3, s4, s5]),
};

const newReadout = {
  ...base,
  id: NEW_ID,
  name: NEW_NAME,
  surveyWaveLabel: "Wave 6 · Sep 2026",
  status: "draft",
  publishedAt: null,
  deck: newDeck,
  createdAt: existing.exists ? existing.data().createdAt ?? now : now,
  updatedAt: now,
};

await db.collection("readouts").doc(NEW_ID).set(newReadout, { merge: false });

console.log(existing.exists ? "Updated readout:" : "Created NEW readout:", NEW_ID);
console.log("Name:", NEW_NAME, "| client:", newReadout.clientId, "| status:", newReadout.status);
console.log("Slides:", newDeck.order.map((key) => newDeck.slides[key].label).join(" | "));
process.exit(0);
