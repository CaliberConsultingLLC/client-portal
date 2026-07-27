process.env.NODE_TLS_REJECT_UNAUTHORIZED="0";
import { readFileSync, existsSync } from "fs";
function loadEnvFile(path){if(!existsSync(path))return;for(const line of readFileSync(path,"utf8").split(/\r?\n/)){const t=line.trim();if(!t||t.startsWith("#"))continue;const eq=t.indexOf("=");if(eq<0)continue;let k=t.slice(0,eq).trim(),v=t.slice(eq+1).trim();if((v.startsWith(String.fromCharCode(34))&&v.endsWith(String.fromCharCode(34)))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);process.env[k]??=v;}}
loadEnvFile(".env.local");
const { loadDwsEmployeeExperienceDashboardData } = await import("../src/lib/employee-experience/dws-dashboard.ts");
const proj = await import("../src/app/employee-experience/dws/ee-live-projections.ts");
const avg=(a)=>a.reduce((x,y)=>x+y,0)/a.length; const r1=(v)=>v==null?null:Math.round(v*10)/10;
const data=await loadDwsEmployeeExperienceDashboardData({sourceClientId:"dws"});
const visIds=data.questions.map(q=>Number(q.itemId));

// independent reference implementation
function ref(rs, ids){const p=[];for(const r of rs){const v=ids.map(i=>r.scores?.[i]).filter(x=>typeof x==="number"); if(v.length)p.push(avg(v));} return p.length?r1(avg(p)*10):null;}

let fails=0, checks=0;
const check=(label, got, want)=>{checks++; const ok = (got==null&&want==null) || (got!=null&&want!=null&&Math.abs(got-want)<0.051); if(!ok){fails++; console.log("  MISMATCH", label, "portal", got, "direct", want);} };

// 1) Historical: overall + index, org + department
const hist=proj.projectHistoricalData(data,{});
console.log("== Historical series ==");
for (const c of hist.campaigns){
  const want=ref(data.respondents.filter(r=>r.campaignLabel===c.label), visIds);
  const got=hist.overallSeries.byOrg[c.id];
  check(`overall org ${c.label}`, got, want);
  console.log("  ", c.label, "portal", got, "| direct person avg", want);
}
for (const idx of hist.indexes){
  const ids=data.questions.filter(q=>q.dimension===idx.name).map(q=>Number(q.itemId));
  const c=hist.campaigns.at(-1);
  check(`index ${idx.name}`, idx.series.byOrg[c.id], ref(data.respondents.filter(r=>r.campaignLabel===c.label), ids));
}
// department spot checks
const c0=hist.campaigns.at(-1);
for (const d of hist.departments.slice(0,12)){
  check(`dept ${d.name} overall`, hist.overallSeries.byDept[d.id][c0.id],
    ref(data.respondents.filter(r=>r.campaignLabel===c0.label && r.department===d.name), visIds));
}

// 2) Department report
const dr=proj.projectDepartmentReportData(data,{});
console.log("\n== Department report ==");
check("dept report org overall", dr.overall.org.current, ref(data.respondents.filter(r=>r.campaignLabel===dr.current.label), visIds));
console.log("  org overall portal", dr.overall.org.current, "| direct", ref(data.respondents.filter(r=>r.campaignLabel===dr.current.label), visIds));
for (const d of dr.departments.slice(0,10)){
  check(`dr dept ${d.name}`, dr.overall.byGroup[d.id].current,
    ref(data.respondents.filter(r=>r.campaignLabel===dr.current.label && r.department===d.name), visIds));
}
for (const idx of dr.indexes){
  const ids=data.questions.filter(q=>q.dimension===idx.name).map(q=>Number(q.itemId));
  check(`dr index ${idx.name} org`, idx.score.org.current, ref(data.respondents.filter(r=>r.campaignLabel===dr.current.label), ids));
}

// 3) Supervisor comparison
const sc=proj.projectSupervisorComparisonData(data,{});
console.log("\n== Supervisor comparison ==");
for (const idx of sc.indexes){
  const ids=data.questions.filter(q=>q.dimension===idx.name).map(q=>Number(q.itemId));
  check(`sup index ${idx.name} org`, idx.score.org.current, ref(data.respondents.filter(r=>r.campaignLabel===sc.current.label), ids));
  for (const s of sc.departments.slice(0,8)){
    check(`sup ${s.name}`, idx.score.byGroup[s.id].current,
      ref(data.respondents.filter(r=>r.campaignLabel===sc.current.label && r.supervisor===s.name), ids));
  }
}

// 4) Division / location / campaign results
const dv=proj.projectDivisionComparisonData(data,{});
for (const idx of dv.indexes){
  const ids=data.questions.filter(q=>q.dimension===idx.name).map(q=>Number(q.itemId));
  for (const l of dv.locations) check(`div ${l.name} ${idx.name}`, idx.score.byGroup[l.id].current,
    ref(data.respondents.filter(r=>r.campaignLabel===dv.current.label && r.division===l.name), ids));
}
const lc=proj.projectLocationComparisonData(data,{});
for (const idx of lc.indexes){
  const ids=data.questions.filter(q=>q.dimension===idx.name).map(q=>Number(q.itemId));
  for (const l of lc.locations) check(`loc ${l.name} ${idx.name}`, idx.score.byGroup[l.id].current,
    ref(data.respondents.filter(r=>r.campaignLabel===lc.current.label && r.location===l.name), ids));
}
const cr=proj.projectCampaignResultsData(data,{});
check("campaign results overall", cr.overallScore.current, ref(data.respondents.filter(r=>r.campaignLabel===cr.current.label), visIds));
console.log("\n== Campaign results overall ==", cr.overallScore.current);

console.log(`\n${checks} checks, ${fails} mismatches`);
