import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import assert from "node:assert/strict";

// Authors the Canopy Services Group Sep/Oct 2026 Integration Effectiveness
// readout (Campaign 2 vs Campaign 1) as a NEW draft. Every figure is computed
// from the Canopy integration CSVs in Firebase Storage (clients/csg/data) using
// the same scoring the portal dashboard uses: score = round(raw) / 10 on a
// 0-10 scale, item score = mean of respondents, overall = mean of every item
// answer. Visual slots are left empty (imageUrl null) for hand-added pictures.
//
// Run: node --env-file=.env.local scripts/csg-integration-readout-author.mjs
// Add --delete-old to remove the existing CSG test readout after creating.

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}
const db = getFirestore();
db.settings({ preferRest: true });
const bucket = getStorage().bucket();

const BASE_READOUT_ID = "csg-insights-readout-csg-2026-07-10";
const NEW_ID = "csg-integration-readout-sep-oct-2026";
const NEW_NAME = "Sep/Oct 2026 Integration Readout (Draft)";

// ---------------------------------------------------------------- data
function parseCSV(text) {
  const rows = [];
  let r = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"') { if (q && n === '"') { f += '"'; i++; } else q = !q; continue; }
    if (c === "," && !q) { r.push(f); f = ""; continue; }
    if ((c === "\n" || c === "\r") && !q) { if (c === "\r" && n === "\n") i++; r.push(f); rows.push(r); r = []; f = ""; continue; }
    f += c;
  }
  if (f.length || r.length) { r.push(f); rows.push(r); }
  return rows;
}
const [dbBuf] = await bucket.file("clients/csg/data/Canopy Integration Database 2026.csv").download();
const rawRows = parseCSV(dbBuf.toString("utf8").replace(/^﻿/, ""));
const H = rawRows[0].map((h) => h.trim());
const all = rawRows.slice(1).filter((r) => r.length > 5).map((r) => Object.fromEntries(H.map((h, i) => [h, (r[i] ?? "").trim()])));

const ITEMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const sc = (v) => Math.round(Number.parseFloat(v)) / 10;
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const r2 = (x) => Math.round(x * 100) / 100;
const f2 = (x) => r2(x).toFixed(2);
const sgn = (x) => (x >= 0 ? "+" : "-") + Math.abs(x).toFixed(2);
const dlt = (a, b) => sgn(r2(b) - r2(a)); // delta from the displayed (rounded) values
const dabs = (a, b) => Math.abs(r2(b) - r2(a)).toFixed(2);

// Title cleanup: fix one typo, and carry titles renamed between campaigns.
// Sales Representative -> Sales Consultant is confirmed by 4 employee IDs that
// answered both campaigns. Customer Engagement -> Customer Engagement
// Specialist is a name match (same brand and department).
const TITLE_MAP = {
  "Sales Represntative": "Sales Consultant",
  "Sales Representative": "Sales Consultant",
  "Customer Engagement": "Customer Engagement Specialist",
};
const title = (d) => TITLE_MAP[d["Job Title"]] ?? d["Job Title"];
const C1 = all.filter((d) => d.Campaign === "Initial");
const C2 = all.filter((d) => d.Campaign === "Second");
assert.equal(all.length, 67);
assert.equal(C1.length, 33);
assert.equal(C2.length, 34);

const item = (set, i) => mean(set.map((d) => sc(d[i])));
const ov = (set) => mean(set.flatMap((d) => ITEMS.map((i) => sc(d[i]))));
const brand = (set, b) => set.filter((d) => d.Brand === b);
const dept = (set, n) => set.filter((d) => d.Department === n);
const ttl = (set, n) => set.filter((d) => title(d) === n);
const isGM = (d) => d["Job Title"] === "General Manager";

// ----------------------------------------------------------- headline numbers
const O1 = ov(C1), O2 = ov(C2);
const ib = (b) => ({ n1: brand(C1, b).length, n2: brand(C2, b).length, a: ov(brand(C1, b)), c: ov(brand(C2, b)) });
const CC = ib("C&C"), TG = ib("Tiger"), BL = ib("Bealing");
const I1 = {}, I2 = {};
for (const i of ITEMS) { I1[i] = item(C1, i); I2[i] = item(C2, i); }
const itemDelta = (i) => r2(I2[i]) - r2(I1[i]);
assert(ITEMS.every((i) => itemDelta(i) < 0), "all 11 items must decline");
assert(CC.c < CC.a && TG.c < TG.a && BL.c < BL.a, "all brands must decline");
const rank2 = [...ITEMS].sort((a, b) => I2[a] - I2[b]);
assert.equal(rank2[0], 7); // smooth/organized is lowest
assert.equal(rank2[1], 5); // ideas welcome is second lowest
assert.equal(rank2[2], 8); // pace third lowest
const brandRange = [CC.c, TG.c, BL.c];
const brandSpread = Math.max(...brandRange) - Math.min(...brandRange);
assert(brandSpread < 0.2);

// Statement-level helper strings
const S = (i, set1 = C1, set2 = C2) => `${f2(item(set2, i))}, ${dlt(item(set1, i), item(set2, i))} from ${f2(item(set1, i))}`;

// ---------------------------------------------------------------- slides
const PILL = {
  green: { pillBg: "#E7F2EB", pillFg: "#2F9151", dot: "#2F9151" },
  gold: { pillBg: "#FBF5E3", pillFg: "#8A6A1F", dot: "#C99A3C" },
  blue: { pillBg: "#E9F0F7", pillFg: "#5E7898", dot: "#5E7898" },
  red: { pillBg: "#F8EAEA", pillFg: "#A2483A", dot: "#C96B60" },
};
const ACCENT = { green: "#2F9151", blue: "#5E7898", gold: "#C99A3C", red: "#C96B60" };
const link = {
  assetId: "integration-dashboard",
  href: "/portal/dashboards/integration-dashboard",
  family: "integration",
  perspectiveId: null,
  campaign: null,
  prior: null,
};

// colors: 0 white, 1 green tint, 2 blue tint, 3 gold tint, 4 charcoal, 5 slate, 7 red tint
function slide({ label, pill, accent, headline, blurb, widths = [0.46, 0.54], colA, colB, blocks }) {
  return {
    label,
    pill: pill.text,
    pillBg: PILL[pill.color].pillBg,
    pillFg: PILL[pill.color].pillFg,
    dot: PILL[pill.color].dot,
    headline,
    blurb,
    focusAccent: ACCENT[accent],
    dashboardLink: link,
    r: widths[0],
    colCount: 2,
    widths,
    cols: { a: colA, b: colB, c: [], d: [] },
    blocks,
  };
}
const visual = (key, sub, caption) => ({
  type: "visual", slot: `${key}-visual`, sub, persp: "Integration Effectiveness", caption, imageUrl: null,
});
const text = (color, subtitle, body, size = 0) => ({ type: "text", color, size, subtitle, body });
const dp = (color, value, subtitle) => ({ type: "datapoint", color, size: 2, value, subtitle, w: 0.5 });

// ---- Slide 1: overall story
const s1 = slide({
  label: "Overall story",
  pill: { color: "red", text: "Declines across all brands" },
  accent: "red",
  headline: "Integration has not been smooth, the pace is too quick, and communication is not frequent enough.",
  blurb: "Campaign 1 to Campaign 2, every integration measure moved down.",
  colA: ["d1", "d2", "t-perception", "t-lowest", "t-comm", "t-ideas"],
  colB: ["v"],
  blocks: {
    v: visual("s1", "Item scores, Campaign 1 vs Campaign 2", "All 11 integration statements, Campaign 1 on the left and Campaign 2 on the right, with change."),
    d1: dp(7, f2(O2), `OVERALL INTEGRATION SCORE · CAMPAIGN 2 · ${dlt(O1, O2)} FROM ${f2(O1)}`),
    d2: dp(7, "11 of 11", "STATEMENTS DECLINED · EVERY BRAND DOWN TOO"),
    "t-perception": text(
      0,
      "What employees are telling us",
      `The perception is that integration has not been smooth, the pace is too quick, and communication is not frequent enough. Brand scores sit close together in Campaign 2 (${f2(Math.min(...brandRange))} to ${f2(Math.max(...brandRange))}), so there is parity across brands. The story is the decline, not a gap between brands.`
    ),
    "t-lowest": text(
      7,
      "Lowest and declining",
      [
        `• The integration process has been smooth and well organized: ${S(7)}. Lowest statement in the survey.`,
        `• The pace of change feels appropriate: ${S(8)}. Third lowest in the survey.`,
        `• Canopy respects the legacy and unique strengths of our brand: ${S(3)}.`,
        `• The acquisition will help the brand succeed long term: ${S(10)}. The largest single drop, though it remains well above the lowest statements. Dipped, still okay.`,
      ].join("\n")
    ),
    "t-comm": text(
      7,
      "Communication is low and slipping",
      `• Brand leadership has clearly communicated why this acquisition benefits us: ${S(1)}.\n• Communication from Canopy leadership is clear and frequent enough: ${S(2)}.\nBoth are low and both are declining, with brand leadership declining more (${dabs(I1[1], I2[1])} versus ${dabs(I1[2], I2[2])}).`
    ),
    "t-ideas": text(
      3,
      "Contingency note: \"My ideas are welcome\"",
      `I feel my ideas and feedback are welcomed and valued during this transition: ${S(5)}. It was low to start and is lower now, the second lowest statement in the survey. Recommendation: reconsider asking this item in future campaigns, because asking may plant the idea that ideas are not welcome. Listed here for completeness.`
    ),
  },
});

// ---- Brand slides
function ranked(set1, set2) {
  const rows = ITEMS.map((i) => ({ i, c2: item(set2, i), d: r2(item(set2, i)) - r2(item(set1, i)) }));
  return rows;
}
const NAME = {
  1: "brand leadership explaining why the acquisition benefits us",
  2: "communication from Canopy leadership",
  3: "respect for the brand's legacy and strengths",
  4: "role clarity under the new structure",
  5: "ideas and feedback being welcomed",
  6: "support and resources from Canopy corporate teams",
  7: "the integration process being smooth and well organized",
  8: "the pace of change feeling appropriate",
  9: "knowing who to contact with a concern",
  10: "belief the acquisition will succeed long term",
  11: "being glad the brand joined Canopy",
};

// C&C
const ccA = brand(C1, "C&C"), ccB = brand(C2, "C&C");
assert(r2(item(ccB, 9)) - r2(item(ccA, 9)) > 0.5);
const ccSales1 = dept(ccA, "Sales"), ccSales2 = dept(ccB, "Sales");
const ccBO1 = dept(ccA, "Back Office"), ccBO2 = dept(ccB, "Back Office");
const s2 = slide({
  label: "C&C",
  pill: { color: "red", text: "Main focus" },
  accent: "red",
  headline: `C&C slipped ${dabs(CC.a, CC.c)}, with Sales feeling the integration most.`,
  blurb: `C&C overall ${f2(CC.a)} to ${f2(CC.c)} (${dlt(CC.a, CC.c)}). ${CC.n1} responses in Campaign 1, ${CC.n2} in Campaign 2.`,
  colA: ["pos", "neg"],
  colB: ["v"],
  blocks: {
    v: visual("s2", "C&C, Campaign 1 vs Campaign 2", "C&C statement scores and department view, Campaign 1 on the left and Campaign 2 on the right, with change."),
    pos: text(
      1,
      "Biggest positive",
      `Knowing who to contact with a concern is the one measure that clearly improved: ${S(9, ccA, ccB)}. Support from Canopy corporate teams (${S(6, ccA, ccB)}) and communication from Canopy leadership (${S(2, ccA, ccB)}) held or edged up. Role clarity remains the highest statement at ${f2(item(ccB, 4))}. Back Office nearly held (${f2(ov(ccBO1))} to ${f2(ov(ccBO2))}, ${dlt(ov(ccBO1), ov(ccBO2))}, ${ccBO2.length} responses).`,
      1
    ),
    neg: text(
      7,
      "Biggest concern",
      `Belief in long-term success fell most (${S(10, ccA, ccB)}), followed by ideas being welcomed (${S(5, ccA, ccB)}) and a smooth, well-organized process (${S(7, ccA, ccB)}). Sales is the lowest large group at ${f2(ov(ccSales2))} (${dlt(ov(ccSales1), ov(ccSales2))}, ${ccSales2.length} responses), where the process (${f2(item(ccSales2, 7))}) and ideas being welcomed (${f2(item(ccSales2, 5))}) are the weakest statements.`,
      1
    ),
  },
});
assert(ov(ccSales2) < CC.c);

// Tiger
const tgA = brand(C1, "Tiger"), tgB = brand(C2, "Tiger");
const tgSales2 = dept(tgB, "Sales");
const tgBO1 = dept(tgA, "Back Office"), tgBO2 = dept(tgB, "Back Office");
const tgRank = ITEMS.slice().sort((a, b) => item(tgB, b) - item(tgB, a));
assert.equal(tgRank[0], 1);
const s3 = slide({
  label: "Tiger",
  pill: { color: "red", text: "Largest decline" },
  accent: "red",
  headline: `Tiger fell the furthest, ${dabs(TG.a, TG.c)}, from the highest starting point.`,
  blurb: `Tiger overall ${f2(TG.a)} to ${f2(TG.c)} (${dlt(TG.a, TG.c)}). Small base: ${TG.n1} responses in Campaign 1, ${TG.n2} in Campaign 2.`,
  colA: ["pos", "neg"],
  colB: ["v"],
  blocks: {
    v: visual("s3", "Tiger, Campaign 1 vs Campaign 2", "Tiger statement scores and department view, Campaign 1 on the left and Campaign 2 on the right, with change."),
    pos: text(
      1,
      "Biggest positive",
      `Brand leadership explaining why the acquisition benefits us is still the highest statement at ${f2(item(tgB, 1))} (${dlt(item(tgA, 1), item(tgB, 1))}), with role clarity next (${S(4, tgA, tgB)}). Tiger Sales is the strongest group at ${f2(ov(tgSales2))} (${tgSales2.length} responses, new in Campaign 2).`,
      1
    ),
    neg: text(
      7,
      "Biggest concern",
      `Knowing who to contact fell the most (${S(9, tgA, tgB)}), followed by support from corporate teams (${S(6, tgA, tgB)}) and a smooth, organized process (${S(7, tgA, tgB)}). Back Office dropped from ${f2(ov(tgBO1))} to ${f2(ov(tgBO2))} (${dlt(ov(tgBO1), ov(tgBO2))}). With only ${TG.n1} responses in Campaign 1, the swings are large and should be read as direction.`,
      1
    ),
  },
});

// Bealing
const blA = brand(C1, "Bealing"), blB = brand(C2, "Bealing");
const blB_ex = blB.filter((d) => d.ID !== "190");
const blSales1 = dept(blA, "Sales"), blSales2 = dept(blB, "Sales");
assert.equal(blB_ex.length, 4);
assert(ITEMS.every((i) => sc(all.find((d) => d.ID === "190" && d.Campaign === "Second")[i]) === 0.1), "ID 190 is all-minimum");
const s4 = slide({
  label: "Bealing",
  pill: { color: "gold", text: "Small base, read with care" },
  accent: "gold",
  headline: `Bealing is down ${dabs(BL.a, BL.c)}, yet staff are still glad to be part of Canopy.`,
  blurb: `Bealing overall ${f2(BL.a)} to ${f2(BL.c)} (${dlt(BL.a, BL.c)}). Small base: ${BL.n1} responses in Campaign 1 (May), ${BL.n2} in Campaign 2.`,
  colA: ["pos", "neg"],
  colB: ["v"],
  blocks: {
    v: visual("s4", "Bealing, Campaign 1 vs Campaign 2", "Bealing statement scores and department view, Campaign 1 on the left and Campaign 2 on the right, with change."),
    pos: text(
      1,
      "Biggest positive",
      `Being glad the brand joined Canopy barely moved (${S(11, blA, blB)}), and belief in long-term success holds among the highest statements at ${f2(item(blB, 10))}. Sales held up (${f2(ov(blSales1))} to ${f2(ov(blSales2))}, ${dlt(ov(blSales1), ov(blSales2))}, ${blSales2.length} responses each campaign).`,
      1
    ),
    neg: text(
      7,
      "Biggest concern",
      `Respect for the brand's legacy and role clarity each fell ${dabs(item(blA, 3), item(blB, 3))} (${f2(item(blA, 3))} to ${f2(item(blB, 3))}), with ideas welcomed (${S(5, blA, blB)}) and a smooth process (${S(7, blA, blB)}) close behind. Caution: one Campaign 2 response rated every statement at the lowest possible score. Without it Bealing is essentially flat (${f2(BL.a)} to ${f2(ov(blB_ex))}, ${dlt(BL.a, ov(blB_ex))}).`,
      1
    ),
  },
});

// ---- Slide 5: longitudinal
const s5 = slide({
  label: "Longitudinal trends",
  pill: { color: "red", text: "Down across the board" },
  accent: "red",
  headline: "Overall, C&C, Tiger and Bealing are all lower than they were in Campaign 1.",
  blurb: "Integration score by campaign, oldest on the left, newest on the right.",
  colA: ["d1", "d2", "d3", "d4", "t-read"],
  colB: ["v"],
  blocks: {
    v: visual("s5", "Integration score over time", "Overall and each brand across Campaign 1 and Campaign 2, oldest on the left, with change."),
    d1: dp(7, f2(O2), `OVERALL · ${dlt(O1, O2)} FROM ${f2(O1)} · ${C2.length} RESPONSES`),
    d2: dp(7, f2(CC.c), `C&C · ${dlt(CC.a, CC.c)} FROM ${f2(CC.a)} · ${CC.n2} RESPONSES`),
    d3: dp(7, f2(TG.c), `TIGER · ${dlt(TG.a, TG.c)} FROM ${f2(TG.a)} · ${TG.n2} RESPONSES`),
    d4: dp(7, f2(BL.c), `BEALING · ${dlt(BL.a, BL.c)} FROM ${f2(BL.a)} · ${BL.n2} RESPONSES`),
    "t-read": text(
      0,
      "The read",
      `Every line points down. All three brands have landed in the same place in Campaign 2 (${f2(Math.min(...brandRange))} to ${f2(Math.max(...brandRange))}) after starting apart (${f2(Math.min(CC.a, TG.a, BL.a))} to ${f2(Math.max(CC.a, TG.a, BL.a))}), and all 11 statements declined. Campaign 1 ran in February for C&C and Tiger and in May for Bealing; Campaign 2 ran in October for all three. Tiger and Bealing bases are small (${TG.n1} and ${BL.n1} responses in Campaign 1), so the size of their moves is directional.`
    ),
  },
});

// ---- Slide 6: functional split
const ops = dept(C2, "Operations Support");
const sales1 = dept(C1, "Sales"), sales2 = dept(C2, "Sales");
const gm1 = C1.filter(isGM), gm2 = C2.filter(isGM);
const rest1 = C1.filter((d) => !isGM(d)), rest2 = C2.filter((d) => !isGM(d));
assert.equal(gm1.length, 2); assert.equal(gm2.length, 2);
assert(item(gm2, 6) < item(rest2, 6) && item(gm2, 4) < item(rest2, 4) && item(gm2, 8) < item(rest2, 8));
assert(item(gm2, 7) > item(rest2, 7));
assert(item(gm2, 1) > item(rest2, 1) && item(gm2, 2) > item(rest2, 2));
assert(ov(ops) < ov(sales2));
const s6 = slide({
  label: "Functional split",
  pill: { color: "red", text: "Ops Support and Sales lowest" },
  accent: "red",
  headline: "Operations Support is lowest, Sales is low, and GMs report less support and less comfort with the pace.",
  blurb: "Department view and General Managers versus everyone else, Campaign 2.",
  colA: ["d1", "d2", "t-gm", "t-comm"],
  colB: ["v"],
  blocks: {
    v: visual("s6", "Department and GM comparison", "Department scores with change, and General Managers versus all other respondents, Campaign 1 on the left and Campaign 2 on the right."),
    d1: dp(7, f2(ov(ops)), `OPERATIONS SUPPORT · LOWEST DEPARTMENT · ${ops.length} RESPONSES · NO CAMPAIGN 1 BASELINE`),
    d2: dp(7, f2(ov(sales2)), `SALES · ${dlt(ov(sales1), ov(sales2))} FROM ${f2(ov(sales1))} · LARGEST GROUP · ${sales2.length} RESPONSES`),
    "t-gm": text(
      2,
      "General Managers versus everyone else",
      `GMs overall: ${f2(ov(gm2))} (${dlt(ov(gm1), ov(gm2))} from ${f2(ov(gm1))}), against ${f2(ov(rest2))} for everyone else (${dlt(ov(rest1), ov(rest2))} from ${f2(ov(rest1))}).\n• Support and resources: GMs ${f2(item(gm2, 6))}, everyone else ${f2(item(rest2, 6))}.\n• Role clarity under the new structure: GMs ${f2(item(gm2, 4))}, everyone else ${f2(item(rest2, 4))}.\n• Pace of change: GMs ${f2(item(gm2, 8))}, everyone else ${f2(item(rest2, 8))}.\n• Smooth integration: GMs fell from ${f2(item(gm1, 7))} to ${f2(item(gm2, 7))} (${dlt(item(gm1, 7), item(gm2, 7))}); everyone else is lower still at ${f2(item(rest2, 7))}.\nWhen the leaders running the brands feel under-supported and rushed, it likely trickles down to their teams. Only ${gm1.length + gm2.length} GM responses (${gm2.length} per campaign), so treat this as directional.`
    ),
    "t-comm": text(
      0,
      "Communication",
      `GMs rate brand leadership's explanation of why (${f2(item(gm2, 1))}) and Canopy updates (${f2(item(gm2, 2))}) above everyone else (${f2(item(rest2, 1))} and ${f2(item(rest2, 2))}). Leaders feel informed; teams feel less so. Sales rates Canopy updates ${f2(item(sales2, 2))} (${dlt(item(sales1, 2), item(sales2, 2))}) and Operations Support ${f2(item(ops, 2))}. Across the organization, brand leadership communication (${f2(I2[1])}, ${dlt(I1[1], I2[1])}) and Canopy communication (${f2(I2[2])}, ${dlt(I1[2], I2[2])}) are both low and both declining.`
    ),
  },
});

// ---- Slide 7: job title heat map
const ces2 = ttl(C2, "Customer Engagement Specialist"), ces1 = ttl(C1, "Customer Engagement Specialist");
const ps2 = ttl(C2, "Production Scheduler");
const cesEx = ces2.filter((d) => d.ID !== "190");
assert.equal(ces2.length, 3); assert.equal(ces1.length, 2); assert.equal(ps2.length, 2);
const allTitles = [...new Set(all.map(title))];
assert.equal(allTitles.length, 20);
const multi = [...new Set(C2.map(title))].filter((t) => ttl(C2, t).length >= 2).map((t) => ({ t, s: ov(ttl(C2, t)) })).sort((a, b) => a.s - b.s);
assert.equal(multi[0].t, "Customer Engagement Specialist");
assert.equal(multi[1].t, "Production Scheduler");
const s7 = slide({
  label: "Job title view",
  pill: { color: "red", text: "Where the heat is" },
  accent: "red",
  headline: "Customer Engagement Specialists and Production Schedulers feel the most heat.",
  blurb: "Every job title on one view, with Campaign 2 scores and change.",
  widths: [0.36, 0.64],
  colA: ["d1", "d2", "t-read"],
  colB: ["v"],
  blocks: {
    v: visual("s7", "Job title heat map", "All 20 job titles by statement on one screen, Campaign 2 scores with change from Campaign 1. Rebuilt to fit without scrolling."),
    d1: dp(7, f2(ov(ces2)), `CUSTOMER ENGAGEMENT SPECIALISTS · ${dlt(ov(ces1), ov(ces2))} FROM ${f2(ov(ces1))} · ${ces2.length} RESPONSES`),
    d2: dp(7, f2(ov(ps2)), `PRODUCTION SCHEDULERS · NEW TITLE IN CAMPAIGN 2 · ${ps2.length} RESPONSES`),
    "t-read": text(
      0,
      "How to read it",
      `Among titles with more than one respondent, these two sit lowest. Single-response titles are shown for completeness and are one person's voice, not a role average. Sales Representative and Sales Consultant are shown as one title (four employees answered both campaigns under the two names), and Customer Engagement is shown with Customer Engagement Specialist.\nNote: the Customer Engagement Specialist average includes one response that rated every statement at the lowest possible score. Without it the title scores ${f2(ov(cesEx))}.`
    ),
  },
});

// ---- Slide 8: role breakdown (no scores in text)
const roleCols = {
  a: [
    "• Sales Consultants: The process and having a voice are the sore spots, and both are worse than before. Role clarity and corporate support are what is holding up.",
    "• General Managers: Hottest on role clarity, support, the process and pace, all down from before. Still confident in who to contact and in the long-term case.",
    "• Controllers: Role clarity, the process and corporate support feel strained, all down from before. Ideas feel welcome and they are glad to be part of Canopy.",
    "• Founder (1 response): Broadly positive and glad to be part of Canopy. The one low note is how clearly brand leadership has explained the why.",
    "• Runners: Role clarity is a strength. Feeling heard has cooled since Campaign 1.",
    "• Sales Managers: Steady and positive on the long-term case and who to contact, with only a slight softening on communication, the process and pace.",
    "• Operations Manager (1 response): Sharp fall from a very positive start, hottest on the process, communication and having a voice.",
  ],
  b: [
    "• Customer Engagement Specialists: Hottest group. Feeling heard and a smooth process are the pain points, and the sharpest fall of any title with more than one response. Includes one very low response (see the heat map slide).",
    "• Production Schedulers: Hot on respect for the legacy, the process and pace. Knowing who to contact and corporate support are what is working. New title.",
    "• Production Manager (1 response): Hot on communication, role clarity and pace. Respect for the brand and support from corporate are holding.",
    "• Accounts Receivable Specialist (1 response): Steady and agreeable across the board, with strong role clarity. Nothing running hot.",
    "• Installation Project Manager (1 response): Hot on communication, feeling heard, support and pace. Clear on role and positive on the long term.",
    "• Permitting Coordinator (1 response): Hot on most of the integration experience. Clear on role and understands why the acquisition happened.",
    "• Operations and Fleet Coordinator (1 response): Even and agreeable on every statement. Nothing running hot.",
    "Not heard from in Campaign 2: Service Technician, Project Manager, Production Coordinator, Payroll Coordinator/AR, Service Manager, Carpenter.",
  ],
};
const s8 = slide({
  label: "Role breakdown",
  pill: { color: "gold", text: "Role by role" },
  accent: "gold",
  headline: "Each role feels the integration differently, and the pressure is concentrated in a few titles.",
  blurb: "One read per job title, with what is hot and what is working.",
  widths: [0.64, 0.36],
  colA: ["t-a", "t-b"],
  colB: ["v"],
  blocks: {
    v: visual("s8", "Supporting evidence", "Heat map or score table for the job titles, Campaign 2 with change, as supporting evidence."),
    "t-a": text(0, "Roles", roleCols.a.join("\n")),
    "t-b": text(0, "Roles, continued", roleCols.b.join("\n")),
  },
});

// ---- Slide 9: employee voice (manual coding of every Campaign 2 comment)
const CODING = {
  positive: ["3030", "3041", "3006", "2022", "190"],
  mixed: ["3034", "3002", "3008", "3036", "3037", "3000", "2024", "2004", "12"],
  negative: ["3005", "3017", "3011", "3023", "3035", "3014", "3015", "2016", "2009"],
  neutral: ["3024", "3009", "2029", "2002", "2003", "185"],
  none: ["3025", "3038", "3026", "184", "1"],
};
const THEMES = {
  systems: ["3030", "3041", "3006", "3002", "3035", "3036", "3015", "2024", "2016", "2009", "2002", "2004", "3023"],
  communication: ["3011", "3017", "3008", "3034", "3000", "3015", "2029", "12", "3037", "2009"],
  unheard: ["3011", "3015", "3035", "3014", "3017"],
  support: ["3005", "3006", "3041", "3034", "190", "2004", "3008"],
  management: ["3005", "3017", "3034", "3014", "3002"],
  departures: ["3011", "3035", "3017"],
  workload: ["2009", "2004", "3008", "3034"],
  marketing: ["3036", "3008", "3037", "185"],
};
const c2ids = new Set(C2.map((d) => d.ID));
const coded = Object.values(CODING).flat();
assert.equal(coded.length, 34);
assert.equal(new Set(coded).size, 34);
assert(coded.every((id) => c2ids.has(id)));
for (const ids of Object.values(THEMES)) assert(ids.every((id) => c2ids.has(id)));
const n = (k) => CODING[k].length;
const th = (k) => THEMES[k].length;
const s9 = slide({
  label: "Employee voice",
  pill: { color: "gold", text: "Mixed, leaning concerned" },
  accent: "gold",
  headline: "Employees are most concerned about systems, communication and being heard.",
  blurb: `Sentiment in the open-ended comments from all ${C2.length} Campaign 2 responses.`,
  colA: ["d1", "d2", "t-themes", "t-voice"],
  colB: ["v"],
  blocks: {
    v: visual("s9", "Comment sentiment and themes", "Sentiment split of the open-ended comments and the standout themes, Campaign 2."),
    d1: dp(7, `${n("negative")} of ${C2.length}`, "RESPONSES WITH NEGATIVE OVERALL SENTIMENT"),
    d2: dp(1, `${n("positive")} of ${C2.length}`, `POSITIVE · ${n("mixed")} MIXED · ${n("neutral")} NEUTRAL · ${n("none")} NO SUBSTANTIVE COMMENT`),
    "t-themes": text(
      0,
      "Standout themes (number of respondents mentioning)",
      [
        `• Systems and tools, ServiceTitan above all (${th("systems")}): mostly requests to fix it or support it better; two ask to remove it.`,
        `• Communication (${th("communication")}): a split picture. Some say Canopy communication is excellent; others want a clear timeline of what is coming next.`,
        `• Feeling heard (${th("unheard")}): concerns raised but not acted on, mostly from Sales.`,
        `• Accessible Canopy support (${th("support")}): "there is always someone to reach out to" is the most common positive.`,
        `• Local management and training (${th("management")}).`,
        `• Workload and pace (${th("workload")}): too many changes at once, long days.`,
        `• Retention risk (${th("departures")}): colleagues have left or are talking about leaving.`,
        `• Local marketing and lead generation (${th("marketing")}): a strength worth keeping.`,
      ].join("\n")
    ),
    "t-voice": text(
      2,
      "In their words",
      `"It's great that there's always someone to reach out to for help within Canopy."\n"Canopy should listen more to the staff as they express their concerns."\n"Map out the future on a timeline of what changes are planned."\n\nCounts come from reading and coding every Campaign 2 comment across the four open-ended questions.`
    ),
  },
});

// ---------------------------------------------------------------- assemble
const slides = { s1, s2, s3, s4, s5, s6, s7, s8, s9 };
const order = Object.keys(slides);

let baseSnap = await db.collection("readouts").doc(BASE_READOUT_ID).get();
if (!baseSnap.exists) baseSnap = await db.collection("readouts").doc(NEW_ID).get(); // re-run after the old test readout was deleted
if (!baseSnap.exists) throw new Error(`Base readout not found: ${BASE_READOUT_ID}`);
const base = baseSnap.data();
const cover = base.deck?.cover ?? {};
const existing = await db.collection("readouts").doc(NEW_ID).get();
const now = new Date().toISOString();

const newDeck = {
  waveLabel: "Sep/Oct 2026",
  cover: {
    ...cover,
    preparedForName: "Canopy Services Group",
    preparedByName: "Dustin Goeglein",
    headline: "Canopy Services Group\nIntegration Effectiveness · Sep/Oct 2026",
    body: `How the integration is landing with ${C2.length} employees across C&C, Tiger and Bealing in Campaign 2, compared with Campaign 1. Nine conversations: the overall story, each brand, the trend, who is feeling it most, and what employees are telling us.`,
    agendaSubhead: "Nine conversations the Campaign 2 data opens up.",
    closingTitle: "What happens next",
    closingBody: "These are conversation starters, not conclusions. We will pressure-test them together in your debrief and choose where to start.",
  },
  order,
  slides,
};

const newReadout = {
  ...base,
  id: NEW_ID,
  name: NEW_NAME,
  clientId: "csg",
  surveyWaveLabel: "Campaign 2 · Sep/Oct 2026",
  status: "draft",
  publishedAt: null,
  deck: newDeck,
  createdAt: existing.exists ? existing.data().createdAt ?? now : now,
  updatedAt: now,
};

// No em dashes or en dashes anywhere in the authored text.
const dump = JSON.stringify(newDeck);
assert(!/[—–]/.test(dump), "em/en dash found in deck text");

await db.collection("readouts").doc(NEW_ID).set(newReadout, { merge: false });
console.log(existing.exists ? "Updated readout:" : "Created NEW readout:", NEW_ID);
console.log("Slides:", order.map((k) => slides[k].label).join(" | "));

if (process.argv.includes("--delete-old")) {
  await db.collection("readouts").doc(BASE_READOUT_ID).delete();
  console.log("Deleted old readout:", BASE_READOUT_ID);
}
process.exit(0);
