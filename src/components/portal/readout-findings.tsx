import { useMemo, useState } from "react";
import { scoreScaleColor } from "@/components/collaboration/score-color-scale";
import type { ReadoutFinding } from "@/types/readout";

type FindingsLayout = "brief" | "stage";

interface ReadoutFindingsProps {
  findings: ReadoutFinding[];
  findingIndex: number;
  editing: boolean;
  onSelectFinding: (index: number) => void;
  onGoIntro: () => void;
  onFinish: () => void;
  onFindingBlur: (findingId: string, field: "headline" | "detail", value: string) => void;
}

function deltaStyle(delta: number) {
  if (delta >= 6) return { bg: "#8BA399", fg: "#fff" };
  if (delta >= 4) return { bg: "#9CB2A8", fg: "#fff" };
  if (delta >= 2) return { bg: "#B5C5BE", fg: "#1F332A" };
  if (delta >= 0.05) return { bg: "#E2E9E5", fg: "#355348" };
  if (delta <= -3) return { bg: "#B49F9C", fg: "#fff" };
  if (delta <= -1) return { bg: "#C8B9B6", fg: "#4E3834" };
  if (delta <= -0.05) return { bg: "#E8DFDE", fg: "#5E4441" };
  return { bg: "#E2E8EF", fg: "#3B4B63" };
}

function formatDelta(value: number) {
  const sign = value >= 0 ? "+" : "−";
  return `${sign}${Math.abs(value).toFixed(1)}`;
}

function toneColor(tone: ReadoutFinding["tone"]) {
  if (tone === "good") return "#2F9151";
  if (tone === "risk") return "#C96B60";
  return "#5E7898";
}

function toneTint(tone: ReadoutFinding["tone"]) {
  if (tone === "good") return "#E7F2EB";
  if (tone === "risk") return "#FBEBE9";
  return "#E9F0F7";
}

function FavBarsChart({ finding }: { finding: ReadoutFinding }) {
  const chartData = finding.chartData as
    | {
        items?: { label: string; value: number; delta?: number }[];
        avg?: number;
        axis?: { min: number; max: number; ticks: number[] };
        highlight?: string;
      }
    | undefined;

  const items = chartData?.items ?? [];
  const axis = chartData?.axis ?? { min: 50, max: 85, ticks: [60, 70, 80] };
  const avg = chartData?.avg;
  const highlight = chartData?.highlight;

  function pct(value: number) {
    const clamped = Math.max(axis.min, Math.min(axis.max, value));
    return `${((clamped - axis.min) / (axis.max - axis.min)) * 100}%`;
  }

  return (
    <div className="relative">
      <div className="space-y-1.5">
        {items.map((item) => {
          const dimmed = Boolean(highlight) && highlight !== item.label;
          const isHighlight = highlight === item.label;
          const hasDelta = typeof item.delta === "number";
          return (
            <div
              key={item.label}
              className={`grid min-h-[30px] grid-cols-[minmax(0,44%)_1fr_56px] items-center gap-2 ${
                dimmed ? "opacity-50" : ""
              }`}
            >
              <p className={`pr-2 text-[12.5px] leading-[1.18] text-[#3B4B63] ${isHighlight ? "font-bold" : "font-medium"}`}>
                {item.label}
              </p>
              <div className="relative h-[23px] overflow-hidden rounded-[3px] bg-[#EFF2F4]">
                <div
                  className="absolute left-0 top-0 h-full rounded-[3px]"
                  style={{
                    width: pct(item.value),
                    background: scoreScaleColor(item.value, axis.min, (axis.min + axis.max) / 2, axis.max),
                  }}
                >
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded bg-[#152238D1] px-1.5 py-0.5 text-[11px] font-bold text-white">
                    {item.value.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                {hasDelta ? (
                  <span
                    className="inline-flex rounded px-1.5 py-0.5 text-[11px] font-bold"
                    style={{ background: deltaStyle(item.delta ?? 0).bg, color: deltaStyle(item.delta ?? 0).fg }}
                  >
                    {formatDelta(item.delta ?? 0)}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-1 grid grid-cols-[44%_1fr_56px] items-center">
        <div />
        <div className="relative h-4">
          {axis.ticks.map((tick) => (
            <span
              key={tick}
              className="absolute -translate-x-1/2 text-[10.5px] font-semibold text-[#6E7E96]"
              style={{ left: pct(tick) }}
            >
              {tick}
            </span>
          ))}
          {typeof avg === "number" ? (
            <span
              className="absolute -top-5 -translate-x-1/2 rounded-full border border-[#D4DAD6] bg-[#E8ECE9] px-2 py-0.5 text-[9.5px] font-bold text-[#3B4B63]"
              style={{ left: pct(avg) }}
            >
              avg {avg.toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function HistoryChart() {
  const labels = ["Jul '24", "Feb '25", "Oct '25"];
  const main = [66.2, 66.9, 67.7];
  const back = [
    [69.2, 70.2, 71.1],
    [67.7, 68.3, 69.0],
    [64.3, 65.4, 66.7],
    [63.4, 63.7, 64.1],
  ];
  const min = 60;
  const max = 74;
  const W = 720;
  const H = 250;
  const pad = { l: 34, r: 64, t: 22, b: 34 };
  const x = (index: number) => pad.l + (index / (main.length - 1)) * (W - pad.l - pad.r);
  const y = (value: number) => pad.t + (1 - (value - min) / (max - min)) * (H - pad.t - pad.b);
  const path = (values: number[]) =>
    values.map((value, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(value)}`).join(" ");
  const ticks = [62, 66, 70, 74];
  const area = `${path(main)} L${x(main.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={pad.l} x2={W - pad.r} y1={y(tick)} y2={y(tick)} stroke="#D3DDE7" strokeDasharray="4 6" />
          <text x={pad.l - 8} y={y(tick) + 4} textAnchor="end" fill="#6E7E96" fontSize={10} fontWeight={700}>
            {tick}
          </text>
        </g>
      ))}
      {labels.map((_, index) => (
        <line
          key={index}
          x1={x(index)}
          x2={x(index)}
          y1={pad.t}
          y2={H - pad.b}
          stroke="#E2E8EF"
          strokeDasharray="3 8"
        />
      ))}
      <path d={area} fill="rgba(129,153,180,.20)" />
      {back.map((series, index) => (
        <path
          key={index}
          d={path(series)}
          fill="none"
          stroke={["#A5B4C7", "#B3BFCE", "#BFC9D6", "#CDD4DE"][index]}
          strokeWidth={1.4}
          opacity={0.7}
        />
      ))}
      <path d={path(main)} fill="none" stroke="#3F5F86" strokeWidth={2.4} />
      {main.map((value, index) => (
        <g key={index}>
          <rect x={x(index) - 20} y={y(value) - 31} width={40} height={22} rx={6} fill="#3B4B63" />
          <text x={x(index)} y={y(value) - 15} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={800}>
            {value.toFixed(1)}
          </text>
          <circle cx={x(index)} cy={y(value)} r={4.5} fill="#fff" stroke="#3F5F86" strokeWidth={1.9} />
          <text
            x={x(index)}
            y={H - 12}
            textAnchor={index === 0 ? "start" : index === main.length - 1 ? "end" : "middle"}
            fill="#3B4B63"
            fontSize={11.5}
            fontWeight={700}
          >
            {labels[index]}
          </text>
        </g>
      ))}
    </svg>
  );
}

function ActionsChart({ finding }: { finding: ReadoutFinding }) {
  const items =
    ((finding.chartData as { items?: { title: string; tone: ReadoutFinding["tone"]; detail: string }[] } | null)
      ?.items ?? []);

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={`${item.title}-${index}`}
          className="flex items-start gap-3.5 rounded-[14px] border px-4 py-4"
          style={{
            borderColor: item.tone === "good" ? "#CDE6D5" : item.tone === "risk" ? "#F0D6D2" : "#D5E2EE",
            background: item.tone === "good" ? "#F1F8F3" : item.tone === "risk" ? "#FCF1EF" : "#F0F5FA",
          }}
        >
          <span
            className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
            style={{ background: toneTint(item.tone), color: toneColor(item.tone) }}
          >
            {index + 1}
          </span>
          <div>
            <p className="text-[15px] font-bold text-[#152238]">{item.title}</p>
            <p className="mt-1 text-[13.5px] leading-[1.5] text-[#3B4B63]">{item.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReadoutFindingsScreen({
  findings,
  findingIndex,
  editing,
  onSelectFinding,
  onGoIntro,
  onFinish,
  onFindingBlur,
}: ReadoutFindingsProps) {
  const [layout, setLayout] = useState<FindingsLayout>("brief");
  const activeFindings = useMemo(
    () => findings.filter((finding) => finding.enabled).sort((left, right) => left.order - right.order),
    [findings]
  );
  const active = activeFindings[findingIndex] ?? activeFindings[0];
  const isFirst = findingIndex === 0;
  const isLast = findingIndex === activeFindings.length - 1;

  if (!active) {
    return (
      <div className="flex h-[calc(100vh-var(--app-top-banner-height))] items-center justify-center bg-[#EFF2ED]">
        <p className="text-sm text-[#60727D]">No findings enabled for this readout yet.</p>
      </div>
    );
  }

  const sections = [
    { id: "stand", label: "Where we stand" },
    { id: "strength", label: "Strengths" },
    { id: "watch", label: "Watch areas" },
    { id: "sowhat", label: "So what" },
  ] as const;

  return (
    <div className="relative grid h-[calc(100vh-var(--app-top-banner-height))] grid-cols-[332px_1fr] overflow-hidden">
      <aside className="overflow-y-auto bg-[linear-gradient(180deg,#242424,#22301f)] px-[18px] pb-10 pt-6">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#E8CC70]">Your readout</p>
        <p className="mb-4 text-[12.5px] leading-[1.5] text-white/55">
          {activeFindings.length} findings, ordered by what matters most
        </p>
        <div className="mb-4 flex gap-3 rounded-xl bg-white/5 px-3 py-2.5 text-[10.5px] font-semibold text-white/70">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#2F9151]" /> Strength
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#C96B60]" /> Watch
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#5E7898]" /> Context
          </span>
        </div>

        {sections.map((section) => {
          const sectionItems = activeFindings.filter((finding) => finding.section === section.id);
          if (sectionItems.length === 0) return null;
          return (
            <div key={section.id} className="mb-4">
              <div className="mb-2 flex items-center gap-2.5 px-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/90">
                  {section.label}
                </span>
                <span className="h-px flex-1 bg-white/15" />
              </div>
              <div className="space-y-1.5">
                {sectionItems.map((finding) => {
                  const index = activeFindings.findIndex((item) => item.id === finding.id);
                  const isActive = index === findingIndex;
                  return (
                    <button
                      key={finding.id}
                      type="button"
                      onClick={() => onSelectFinding(index)}
                      className="flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left"
                      style={{
                        background: isActive ? "rgba(232,204,112,0.14)" : "transparent",
                        borderColor: isActive ? "rgba(232,204,112,0.45)" : "rgba(255,255,255,0.07)",
                      }}
                    >
                      <span
                        className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{
                          background: toneColor(finding.tone),
                          boxShadow: isActive ? "0 0 0 3px rgba(232,204,112,0.35)" : "none",
                        }}
                      />
                      <span className="min-w-0">
                        <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-[0.13em] text-white/50">
                          {finding.verdict}
                        </span>
                        <span className={`block text-[13px] font-semibold leading-[1.32] ${isActive ? "text-white" : "text-white/75"}`}>
                          {finding.headlineShort}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </aside>

      <section className="flex flex-col overflow-hidden bg-[#EFF2ED] px-10 pb-5 pt-7">
        <div className="mb-4 flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: toneColor(active.tone) }} />
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.2em] text-[#6E7E96]">{active.eyebrow}</span>
          <span
            className="rounded-full px-2.5 py-[3px] text-[10.5px] font-bold"
            style={{ background: toneTint(active.tone), color: toneColor(active.tone) }}
          >
            {active.verdict}
          </span>
          <span className="ml-auto text-[11.5px] font-semibold text-[#9AA7B4]">
            Finding {findingIndex + 1} of {activeFindings.length}
          </span>
        </div>

        <div className={`grid min-h-0 flex-1 gap-7 ${layout === "brief" ? "grid-cols-[0.82fr_1.18fr]" : "grid-cols-[1.42fr_0.58fr]"}`}>
          {layout === "brief" ? (
            <>
              <div className="flex min-h-0 flex-col">
                <h2
                  className="font-['Playfair_Display'] text-[33px] leading-[1.14] tracking-[-0.01em] text-[#152238]"
                  contentEditable={editing}
                  suppressContentEditableWarning
                  onBlur={(event) => onFindingBlur(active.id, "headline", event.currentTarget.innerText)}
                >
                  {active.headline}
                </h2>
                <p
                  className="mt-4 text-[15px] leading-[1.6] text-[#3B4B63]"
                  contentEditable={editing}
                  suppressContentEditableWarning
                  onBlur={(event) => onFindingBlur(active.id, "detail", event.currentTarget.innerText)}
                >
                  {active.detail}
                </p>
                <div className="mt-auto space-y-3">
                  {active.means ? (
                    <div className="rounded-[14px] border border-[#DCE3DD] bg-white px-[18px] py-4">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">The read</p>
                      <p className="text-[13.5px] leading-[1.55] text-[#3B4B63]">{active.means}</p>
                    </div>
                  ) : null}
                  {active.act ? (
                    <div
                      className="rounded-[14px] border px-[18px] py-4"
                      style={{
                        borderColor: active.tone === "good" ? "#CDE6D5" : active.tone === "risk" ? "#F0D6D2" : "#D5E2EE",
                        background: active.tone === "good" ? "#F1F8F3" : active.tone === "risk" ? "#FCF1EF" : "#F0F5FA",
                      }}
                    >
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: toneColor(active.tone) }}>
                        Do this next
                      </p>
                      <p className="mb-3 text-[13.5px] leading-[1.55] text-[#3B4B63]">{active.act}</p>
                    </div>
                  ) : null}
                </div>
              </div>
              <DataPanel finding={active} />
            </>
          ) : (
            <>
              <DataPanel finding={active} />
              <div className="space-y-3">
                <p
                  className="text-[14.5px] leading-[1.6] text-[#3B4B63]"
                  contentEditable={editing}
                  suppressContentEditableWarning
                  onBlur={(event) => onFindingBlur(active.id, "detail", event.currentTarget.innerText)}
                >
                  {active.detail}
                </p>
                {active.means ? (
                  <div className="rounded-[14px] border border-[#DCE3DD] bg-white px-4 py-4">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">The read</p>
                    <p className="text-[13px] leading-[1.5] text-[#3B4B63]">{active.means}</p>
                  </div>
                ) : null}
                {active.act ? (
                  <div
                    className="rounded-[14px] border px-4 py-4"
                    style={{
                      borderColor: active.tone === "good" ? "#CDE6D5" : active.tone === "risk" ? "#F0D6D2" : "#D5E2EE",
                      background: active.tone === "good" ? "#F1F8F3" : active.tone === "risk" ? "#FCF1EF" : "#F0F5FA",
                    }}
                  >
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: toneColor(active.tone) }}>
                      Do this next
                    </p>
                    <p className="text-[13px] leading-[1.5] text-[#3B4B63]">{active.act}</p>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

        <footer className="mt-4 flex items-center gap-3 border-t border-[#DCE3DD] pt-3.5">
          <div className="flex flex-1 items-center gap-1.5">
            {activeFindings.map((finding, index) => (
              <button
                key={finding.id}
                type="button"
                aria-label="Go to finding"
                onClick={() => onSelectFinding(index)}
                className="h-[7px] rounded-full transition-all"
                style={{ width: index === findingIndex ? 30 : 7, background: index === findingIndex ? "#386B45" : "#CBD4CC" }}
              />
            ))}
          </div>
          <span className="mr-1 text-[11.5px] font-semibold text-[#9AA7B4]">{active.verdict}</span>
          <button
            type="button"
            onClick={() => {
              if (isFirst) {
                onGoIntro();
              } else {
                onSelectFinding(Math.max(0, findingIndex - 1));
              }
            }}
            className="rounded-full border border-[#CBD4CC] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#3B4B63]"
          >
            {isFirst ? "← Intro" : "← Prev"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLast) {
                onFinish();
              } else {
                onSelectFinding(Math.min(activeFindings.length - 1, findingIndex + 1));
              }
            }}
            className="rounded-full px-4 py-2.5 text-[13px] font-semibold text-white"
            style={{ background: isLast ? "#386B45" : "#242424" }}
          >
            {isLast ? "Finish →" : "Next →"}
          </button>
        </footer>
      </section>

      {editing ? (
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full border border-[#F0E2B6] bg-[#FFFDF5] px-4 py-2 text-xs font-medium text-[#5A4410] shadow-[0_6px_18px_rgba(17,17,17,0.1)]">
          ✎ Editing - click any headline or paragraph to rewrite it.
        </div>
      ) : null}

      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-[#141C18EB] px-3 py-2 shadow-[0_12px_34px_rgba(0,0,0,0.35)]">
        <span className="px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#E8CC70D9]">Iteration</span>
        <button
          type="button"
          className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold"
          style={{ background: layout === "brief" ? "#E8CC70" : "rgba(255,255,255,0.08)", color: layout === "brief" ? "#242424" : "rgba(255,255,255,0.8)" }}
          onClick={() => setLayout("brief")}
        >
          1 · Brief
        </button>
        <button
          type="button"
          className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold"
          style={{ background: layout === "stage" ? "#E8CC70" : "rgba(255,255,255,0.08)", color: layout === "stage" ? "#242424" : "rgba(255,255,255,0.8)" }}
          onClick={() => setLayout("stage")}
        >
          2 · Stage
        </button>
      </div>
    </div>
  );
}

function DataPanel({ finding }: { finding: ReadoutFinding }) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#8798AA] bg-white shadow-[7px_9px_20px_rgba(15,23,42,0.07),2px_3px_6px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2.5 border-b border-[#E2E8EF] bg-[#F1F4F7] px-5 py-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#2B2B2B]">
          {finding.perspGroup}
        </span>
        <span className="text-xs text-[#9AA7B4]">›</span>
        <span className="rounded-full bg-[#242424] px-2.5 py-1 text-[11.5px] font-semibold text-white">
          {finding.persp}
        </span>
      </div>
      <div className="px-[22px] pb-1 pt-[18px]">
        <p className="text-[15px] font-bold text-[#152238]">{finding.chartTitle}</p>
        <p className="mt-1 text-[11px] text-[#6E7E96]">{finding.chartSub}</p>
      </div>
      <div className="flex-1 overflow-auto px-[22px] py-2">
        {finding.chartType === "history" ? <HistoryChart /> : null}
        {finding.chartType === "favbars" ? <FavBarsChart finding={finding} /> : null}
        {finding.chartType === "actions" ? <ActionsChart finding={finding} /> : null}
      </div>
      <div className="border-t border-[#E2E8EF] bg-[#FBFCFB] px-[22px] py-3">
        <p className="text-[11px] leading-[1.5] text-[#6E7E96]">
          <span className="font-bold text-[#3B4B63]">How to read:</span> {finding.howToRead}
        </p>
      </div>
    </div>
  );
}
