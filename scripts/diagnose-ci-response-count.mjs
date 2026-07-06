import { readFileSync } from "fs";

function parseCSV(text) {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '"') q = !q;
    else if (ch === "\n" && !q) {
      lines.push(cur.replace(/\r$/, ""));
      cur = "";
    } else cur += ch;
  }
  if (cur.length) lines.push(cur.replace(/\r$/, ""));
  return lines.map((line) => {
    const f = [];
    let field = "";
    let qq = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') qq = !qq;
      else if (c === "," && !qq) {
        f.push(field.trim());
        field = "";
      } else field += c;
    }
    f.push(field.trim());
    return f;
  });
}

const NORMALIZE = {
  Production: "Production Floor",
  "Production Control": "Production Control & Sourcing",
  Sourcing: "Production Control & Sourcing",
};
const norm = (v) => NORMALIZE[v] ?? v;

const db = parseCSV(readFileSync(".tmp-tf/database.csv", "utf8"));
const stmt = parseCSV(readFileSync(".tmp-tf/statements.csv", "utf8"));
const headers = db[0];
const columnForItem = {};
headers.forEach((h, i) => {
  if (/^\d+$/.test(h)) columnForItem[parseInt(h, 10)] = i;
});
const deptCol = headers.findIndex((h) => h.toLowerCase() === "department");
const rows = db.slice(1).filter((r) => r.length > deptCol && r.some((c) => c.trim() !== ""));

const val = (row, itemId) => {
  const idx = columnForItem[itemId];
  if (idx === undefined) return null;
  const raw = row[idx];
  if (!raw || raw.trim() === "") return null;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? null : n;
};

console.log("Item 54:", stmt.find((r) => r[0] === "54")?.slice(0, 4).join(" | "));
console.log("Item 21:", stmt.find((r) => r[0] === "21")?.slice(0, 4).join(" | "));
console.log("Total respondent rows:", rows.length);

function rawColCount(itemId) {
  return rows.filter((r) => val(r, itemId) !== null).length;
}

function rawColCountExclSelf(itemId, targetCanonical) {
  return rows.filter((r) => {
    if (val(r, itemId) === null) return false;
    return norm(r[deptCol] || "") !== targetCanonical;
  }).length;
}

console.log("\n--- Raw non-empty cells (all raters, incl self) ---");
console.log("Col 54 (Production Control CI Q1):", rawColCount(54));
console.log("Col 21 (Customer Service CI Q1):", rawColCount(21));

console.log("\n--- Raw col count EXCLUDING self-raters ---");
console.log(
  "Col 54 excl self (Prod Control & Sourcing):",
  rawColCountExclSelf(54, "Production Control & Sourcing")
);
console.log(
  "Col 21 excl self (Customer Service):",
  rawColCountExclSelf(21, "Customer Service")
);

const deptScoreItemIds = {};
for (let i = 1; i < stmt.length; i++) {
  const [id, index, comment, text] = stmt[i];
  const itemId = parseInt(id, 10);
  if (index === "Dept Score") {
    const c = norm(text);
    (deptScoreItemIds[c] ??= []).push(itemId);
  }
}

const avgItems = (row, ids) => {
  const values = ids.map((id) => val(row, id)).filter((v) => v !== null);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
};

function incomingCdrsCount(targetDept) {
  let n = 0;
  for (const row of rows) {
    const src = norm(row[deptCol] || "");
    if (src === targetDept) continue;
    if (avgItems(row, deptScoreItemIds[targetDept] || []) !== null) n++;
  }
  return n;
}

function ciItemIdsForDept(targetDept) {
  const ids = [];
  for (let i = 1; i < stmt.length; i++) {
    const [id, index, comment] = stmt[i];
    if (index === "Dept Score" || comment === "X") continue;
    if (norm(index) === targetDept) ids.push(parseInt(id, 10));
  }
  return ids;
}

function uniqueCiRaters(targetDept) {
  const ciIds = ciItemIdsForDept(targetDept);
  const ids = new Set();
  for (const row of rows) {
    const src = norm(row[deptCol] || "");
    if (src === targetDept) continue;
    if (ciIds.some((id) => val(row, id) !== null)) {
      ids.add(`${row[deptCol]}|${row[0] ?? ""}`);
    }
  }
  return ids.size;
}

function ciScoreCellCount(targetDept) {
  const ciIds = ciItemIdsForDept(targetDept);
  let n = 0;
  for (const row of rows) {
    const src = norm(row[deptCol] || "");
    if (src === targetDept) continue;
    for (const id of ciIds) if (val(row, id) !== null) n++;
  }
  return n;
}

function deptHeadcount(canonical) {
  return rows.filter((r) => norm(r[deptCol] || "") === canonical).length;
}

console.log("\n--- Portal CI Report 'Responses' (actually incomingCount / CDRS) ---");
console.log(
  "Production Control & Sourcing:",
  incomingCdrsCount("Production Control & Sourcing")
);
console.log("Customer Service:", incomingCdrsCount("Customer Service"));

console.log("\n--- CI-specific counts (excl self-ratings) ---");
console.log(
  "Prod Control & Sourcing unique CI raters:",
  uniqueCiRaters("Production Control & Sourcing")
);
console.log("Customer Service unique CI raters:", uniqueCiRaters("Customer Service"));
console.log(
  "Prod Control & Sourcing total CI answer cells:",
  ciScoreCellCount("Production Control & Sourcing")
);
console.log("Customer Service total CI answer cells:", ciScoreCellCount("Customer Service"));

console.log("\n--- Employees IN department ---");
console.log("Prod Control & Sourcing:", deptHeadcount("Production Control & Sourcing"));
console.log("Customer Service:", deptHeadcount("Customer Service"));

console.log("\nDept Score item IDs for merged dept:", deptScoreItemIds["Production Control & Sourcing"]);

const roleCol = headers.findIndex((h) => h.toLowerCase() === "role");
const genCol = headers.findIndex((h) => h.toLowerCase() === "generation");
const tenCol = headers.findIndex((h) => h.toLowerCase() === "tenure");

function countByInDept(deptName, col) {
  const inDept = rows.filter((r) => (r[deptCol] || "").trim() === deptName);
  const m = {};
  inDept.forEach((r) => {
    const v = (r[col] || "").trim() || "(blank)";
    m[v] = (m[v] || 0) + 1;
  });
  return { headcount: inDept.length, segments: m };
}

console.log("\n--- Employees IN department (segment breakdown source) ---");
for (const dept of ["IT", "Product Development", "Customer Service", "Production Control", "Sourcing"]) {
  console.log(`\n${dept}:`);
  console.log("  role:", JSON.stringify(countByInDept(dept, roleCol)));
  console.log("  generation:", JSON.stringify(countByInDept(dept, genCol)));
  console.log("  tenure:", JSON.stringify(countByInDept(dept, tenCol)));
}

console.log("\n--- Incoming CDRS raters (what 'Responses' shows on CDRS report) ---");
for (const dept of ["IT", "Product Development", "Customer Service"]) {
  console.log(`${dept}: ${incomingCdrsCount(dept)} incoming raters`);
}
