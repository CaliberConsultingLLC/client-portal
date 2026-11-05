import { scoreScaleColor } from "@/components/collaboration/score-color-scale";
import { INTEGRATION_SCORE_SCALE } from "@/lib/integration-effectiveness/score-scale";
import {
  FIT_HEATMAP_ITEMS,
  loadJobTitleFitHeatmap,
  type FitHeatmapRow,
} from "@/lib/integration-effectiveness/job-title-fit-heatmap";

export const dynamic = "force-dynamic";
export const metadata = { title: "Canopy job title heat map" };

const { minValue, midpoint, maxValue } = INTEGRATION_SCORE_SCALE;
const DARK = "#1C252A";

function textOn(hex: string) {
  const c = hex.replace("#", "");
  const l = 0.299 * parseInt(c.slice(0, 2), 16) + 0.587 * parseInt(c.slice(2, 4), 16) + 0.114 * parseInt(c.slice(4, 6), 16);
  return l > 150 ? DARK : "#FFFFFF";
}
const r2 = (x: number) => Math.round(x * 100) / 100;
// Scores are shown on the 100-point scale (internal 0-10 value x 10), one decimal.
const f = (x: number) => (Math.round(x * 100) / 10).toFixed(1);
const sgn = (x: number) => `${x >= 0 ? "+" : "-"}${Math.abs(Math.round(x * 100) / 10).toFixed(1)}`;

function Cell({ value, delta, muted }: { value: number | null; delta: number | null; muted?: boolean }) {
  const bg = scoreScaleColor(value, minValue, midpoint, maxValue);
  return (
    <td
      style={{ background: bg, color: textOn(bg), opacity: muted ? 0.55 : 1 }}
      className="border border-white px-0 py-1 text-center align-middle"
    >
      <div className="text-[15px] font-bold leading-tight">{value === null ? " " : f(value)}</div>
      <div className="text-[10px] leading-tight opacity-90">{delta === null ? " " : sgn(delta)}</div>
    </td>
  );
}

function Row({ row, prior }: { row: FitHeatmapRow; prior?: boolean }) {
  // Titles seen only in Campaign 1 show their Campaign 1 overall, faded.
  const overall = prior ? row.overall1 : row.overall2;
  const overallDelta =
    !prior && row.overall1 !== null && row.overall2 !== null ? r2(row.overall2) - r2(row.overall1) : null;
  return (
    <tr>
      <th className="border border-white bg-[#F4F1EA] px-2 py-1 text-left text-[12px] font-semibold leading-tight text-[#1C252A]">
        {row.title}
        {prior ? <span className="block text-[10px] font-normal text-[#6E7E96]">Campaign 1 only</span> : null}
      </th>
      <td className="border border-white bg-[#F4F1EA] px-1 text-center text-[11px] text-[#3B4B63]">
        {row.n1} / {row.n2}
      </td>
      <Cell value={overall} delta={overallDelta} muted={prior} />
      {FIT_HEATMAP_ITEMS.map((it, i) => (
        <Cell key={it.id} value={prior ? null : row.items2[i]} delta={prior ? null : row.itemDeltas[i]} muted={prior} />
      ))}
    </tr>
  );
}

export default async function CsgJobTitleHeatmapPage() {
  const { current, priorOnly } = await loadJobTitleFitHeatmap();
  return (
    <div className="bg-white p-6">
      <div id="job-title-heatmap" className="mx-auto w-[1240px] bg-white p-4">
        <h1 className="text-[20px] font-bold text-[#152238]">Job title heat map</h1>
        <p className="mb-3 text-[12px] text-[#6E7E96]">
          Canopy Services Group integration, Campaign 2 (Sep/Oct 2026). Each cell shows the Campaign 2 score (100-point scale) and the
          change in points from Campaign 1. Responses (n) shown as Campaign 1 / Campaign 2. Sales Representative is shown with Sales Consultant, and
          Customer Engagement with Customer Engagement Specialist. Titles are ordered lowest to highest.
        </p>
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col style={{ width: "190px" }} />
            <col style={{ width: "58px" }} />
            <col style={{ width: "74px" }} />
            {FIT_HEATMAP_ITEMS.map((it) => (
              <col key={it.id} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="border border-white bg-[#3B4B63] px-2 py-2 text-left text-[11px] font-semibold text-white">Job title</th>
              <th className="border border-white bg-[#3B4B63] px-1 py-2 text-center text-[11px] font-semibold text-white">n</th>
              <th className="border border-white bg-[#3B4B63] px-1 py-2 text-center text-[11px] font-semibold text-white">Overall</th>
              {FIT_HEATMAP_ITEMS.map((it) => (
                <th
                  key={it.id}
                  className="border border-white bg-[#3B4B63] px-1 py-2 text-center text-[10px] font-semibold leading-tight text-white"
                >
                  {it.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {current.map((row) => (
              <Row key={row.title} row={row} />
            ))}
            {priorOnly.map((row) => (
              <Row key={row.title} row={row} prior />
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-[#6E7E96]">
          Titles with one response are one person&apos;s voice, not a role average. Campaign 1 only titles show their Campaign 1 overall
          score (faded) and no Campaign 2 detail. One Campaign 2 response that rated every statement at the minimum is excluded.
        </p>
      </div>
    </div>
  );
}
