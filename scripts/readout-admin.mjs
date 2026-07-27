import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function initAdmin() {
  if (getApps().length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE_* env. Run with: node --env-file=.env.local scripts/readout-admin.mjs");
  }
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

initAdmin();
const db = getFirestore();
// Local dev sits behind a TLS-intercepting proxy that gRPC can't verify; REST
// transport goes through Node https (honors NODE_TLS_REJECT_UNAUTHORIZED).
db.settings({ preferRest: true });

const mode = process.argv[2] ?? "list";

if (mode === "list") {
  const snap = await db.collection("readouts").get();
  console.log(`readouts: ${snap.size}`);
  snap.forEach((doc) => {
    const r = doc.data();
    console.log("---");
    console.log("id:", doc.id);
    console.log("name:", r.name);
    console.log("clientId:", r.clientId);
    console.log("status:", r.status);
    console.log("deck.order:", JSON.stringify(r.deck?.order ?? null));
    console.log("deck.cover.headline:", r.deck?.cover?.headline ?? null);
    console.log("cover.preparedForName:", r.deck?.cover?.preparedForName ?? null);
    console.log("cover.preparedByName:", r.deck?.cover?.preparedByName ?? null);
    console.log("cover.logoUrl:", r.deck?.cover?.logoUrl ?? null);
  });
  process.exit(0);
}

if (mode === "dump") {
  const id = process.argv[3];
  const doc = await db.collection("readouts").doc(id).get();
  if (!doc.exists) {
    console.log("not found:", id);
    process.exit(1);
  }
  console.log(JSON.stringify(doc.data(), null, 2));
  process.exit(0);
}

console.log("unknown mode:", mode);
process.exit(1);
