import { readFileSync } from "fs";

function parseCSV(text) {
  const rows = [];
  let cur = "";
  let q = false;
  const lines = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { q = !q; cur += ch; }
    else if (ch === "\n" && !q) { lines.push(cur.replace(/\r$/, "")); cur = ""; }
    else cur += ch;
  }
  if (cur.trim()) lines.push(cur.replace(/\r$/, ""));
  for (const line of lines) {
    const f = [];
    let field = "";
    let qq = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') qq = !qq;
      else if (c === "," && !qq) { f.push(field.trim()); field = ""; }
      else field += c;
    }
    f.push(field.trim());
    rows.push(f);
  }
  return rows;
}

const db = parseCSV(readFileSync(".tmp-tf/database.csv", "utf8"));
const stmt = parseCSV(readFileSync(".tmp-tf/statements.csv", "utf8"));

const headers = db[0];
const colForItem = {}; // itemId -> column index (header-driven)
headers.forEach((h, idx) => {
  if (/^\d+$/.test(h)) colForItem[parseInt(h, 10)] = idx;
});
const deptColIdx = headers.findIndex((h) => h.toLowerCase() === "department");

// statements
const deptScore = []; // {itemId, dept}
const ciItems = {}; // dept -> [itemId]
const commentItems = {}; // dept -> [{itemId, text}]
for (let i = 1; i < stmt.length; i++) {
  const [id, index, comment, text] = stmt[i];
  const itemId = parseInt(id, 10);
  if (!Number.isFinite(itemId)) continue;
  if (index === "Dept Score") deptScore.push({ itemId, dept: text });
  else {
    const dept = index;
    if (comment === "X") {
      (commentItems[dept] ??= []).push({ itemId, text });
    } else {
      (ciItems[dept] ??= []).push(itemId);
    }
  }
}
const departments = deptScore.map((d) => d.dept);
const deptScoreMap = Object.fromEntries(deptScore.map((d) => [d.dept, d.itemId]));

const NORMALIZE = { Production: "Production Floor" };
const norm = (d) => NORMALIZE[d] ?? d;

const rows = db.slice(1).filter((r) => r.length > deptColIdx);

function val(row, itemId) {
  const idx = colForItem[itemId];
  if (idx === undefined) return null;
  const raw = row[idx];
  if (raw === undefined || raw.trim() === "") return null;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? null : n;
}

console.log("Departments:", JSON.stringify(departments));
console.log("Distinct DB departments:", JSON.stringify([...new Set(rows.map((r) => r[deptColIdx]))]));
console.log("CI item counts per dept:", Object.fromEntries(Object.entries(ciItems).map(([k, v]) => [k, v.length])));
console.log("Comment item counts per dept:", Object.fromEntries(Object.entries(commentItems).map(([k, v]) => [k, v.length])));

// Self-rating analysis
let selfCount = 0;
const selfByDept = {};
for (const row of rows) {
  const rd = norm(row[deptColIdx]);
  if (!rd) continue;
  const itemId = deptScoreMap[rd];
  if (itemId === undefined) continue;
  const v = val(row, itemId);
  if (v !== null) { selfCount++; selfByDept[rd] = (selfByDept[rd] ?? 0) + 1; }
}
console.log("\nSelf-ratings present:", selfCount);
console.log("Self-ratings by dept:", JSON.stringify(selfByDept));

// Incoming CDRS both ways for each dept
console.log("\n=== Incoming CDRS (avg of dept-score column, 0-100) ===");
for (const dept of departments) {
  const itemId = deptScoreMap[dept];
  const all = [];
  const exclSelf = [];
  for (const row of rows) {
    const v = val(row, itemId);
    if (v === null) continue;
    all.push(v);
    if (norm(row[deptColIdx]) !== dept) exclSelf.push(v);
  }
  const a = all.length ? all.reduce((x, y) => x + y, 0) / all.length : 0;
  const e = exclSelf.length ? exclSelf.reduce((x, y) => x + y, 0) / exclSelf.length : 0;
  console.log(
    `  ${dept.padEnd(22)} incl-self=${a.toFixed(1)} (n=${all.length})   excl-self=${e.toFixed(1)} (n=${exclSelf.length})`
  );
}

// Outgoing CDRS by DB department (avg of all dept-score answers given by that dept's employees)
console.log("\n=== Outgoing CDRS (avg of all dept-score answers by dept employees, 0-100) ===");
const allDeptItems = deptScore.map((d) => d.itemId);
for (const dept of departments) {
  const employees = rows.filter((r) => norm(r[deptColIdx]) === dept);
  const answers = [];
  for (const row of employees) {
    for (const itemId of allDeptItems) {
      const v = val(row, itemId);
      if (v !== null) answers.push(v);
    }
  }
  const o = answers.length ? answers.reduce((x, y) => x + y, 0) / answers.length : 0;
  console.log(`  ${dept.padEnd(22)} outgoing=${answers.length ? o.toFixed(1) : "—"} (employees=${employees.length}, answers=${answers.length})`);
}

// distinct values for segmentation
console.log("\nDistinct Roles:", JSON.stringify([...new Set(rows.map((r) => r[headers.indexOf("Role")]))]));
console.log("Distinct Generations:", JSON.stringify([...new Set(rows.map((r) => r[headers.indexOf("Generation")]))]));
console.log("Distinct Tenure:", JSON.stringify([...new Set(rows.map((r) => r[headers.indexOf("Tenure")]))]));

// comment sample
console.log("\n=== Sample comments ===");
let shown = 0;
for (const row of rows) {
  for (const dept of departments) {
    for (const c of commentItems[dept] ?? []) {
      const idx = colForItem[c.itemId];
      const txt = row[idx];
      if (txt && txt.trim()) {
        console.log(`  [${dept}] (${row[deptColIdx]}) ${txt.slice(0, 90)}`);
        if (++shown >= 8) { console.log("  ..."); process.exit(0); }
      }
    }
  }
}
