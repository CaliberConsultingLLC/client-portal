import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Layout-only pass for the Canopy Sep/Oct 2026 readout on the 36 x 16 grid.
// Touches only each block's grid rectangle and text size; all copy, numbers,
// images and other settings are left exactly as stored.
//
// Run: node --env-file=.env.local scripts/csg-readout-relayout.mjs

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}
const db = getFirestore();
db.settings({ preferRest: true });
const ref = db.collection("readouts").doc("csg-integration-readout-sep-oct-2026");

// [x, y, w, h, textSize?]  (grid is 36 columns x 16 rows; text sizes 0-3 = 13/15/17/19px)
const L = {
  s1: {
    d1: [0, 0, 5, 5],
    d2: [5, 0, 5, 5],
    "t-perception": [10, 0, 17, 5, 1],
    "t-lowest": [0, 5, 15, 7, 1],
    "t-comm": [15, 5, 12, 7, 1],
    "t-ideas": [0, 12, 27, 4, 1],
    v: [27, 0, 9, 16],
  },
  s2: { pos: [0, 0, 18, 8, 3], neg: [0, 8, 18, 8, 3], v: [18, 0, 18, 16] },
  s3: { pos: [0, 0, 18, 8, 3], neg: [0, 8, 18, 8, 3], v: [18, 0, 18, 16] },
  s4: { pos: [0, 0, 18, 8, 3], neg: [0, 8, 18, 8, 3], v: [18, 0, 18, 16] },
  s5: {
    d1: [0, 0, 9, 4],
    d2: [9, 0, 9, 4],
    d3: [18, 0, 9, 4],
    d4: [27, 0, 9, 4],
    v: [0, 4, 22, 12],
    "t-read": [22, 4, 14, 12, 2],
  },
  s6: {
    d1: [0, 0, 11, 4],
    d2: [11, 0, 11, 4],
    "t-gm": [0, 4, 12, 12, 1],
    "t-comm": [12, 4, 10, 12, 1],
    v: [22, 0, 14, 16],
  },
  s7: {
    d1: [0, 0, 10, 4],
    d2: [0, 4, 10, 4],
    "t-read": [0, 8, 10, 8, 0],
    v: [10, 0, 26, 16],
  },
  s8: { "t-a": [0, 0, 12, 16, 0], "t-b": [12, 0, 14, 16, 0], v: [26, 0, 10, 16] },
  s9: {
    d1: [0, 0, 10, 4],
    d2: [10, 0, 10, 4],
    "t-themes": [0, 4, 13, 12, 0],
    "t-voice": [13, 4, 7, 12, 0],
    v: [20, 0, 16, 16],
  },
};

const snap = await ref.get();
const deck = snap.data().deck;
for (const [key, layout] of Object.entries(L)) {
  const sl = deck.slides[key];
  if (!sl) throw new Error("missing slide " + key);
  const ids = Object.keys(sl.blocks).sort();
  if (JSON.stringify(ids) !== JSON.stringify(Object.keys(layout).sort())) {
    throw new Error(`block mismatch on ${key}: ${ids.join(",")}`);
  }
  const grid = {};
  for (const [id, [x, y, w, h, size]] of Object.entries(layout)) {
    grid[id] = { x, y, w, h };
    if (size !== undefined && sl.blocks[id].type === "text") sl.blocks[id].size = size;
  }
  sl.layout = "grid";
  sl.grid = grid;
  sl.gridRes = 2;
}
deck.textSizes = 2;
await ref.update({ deck, updatedAt: new Date().toISOString() });
console.log("relaid out slides:", Object.keys(L).join(", "));
