"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { scoreScaleLegendGradient } from "@/components/collaboration/score-color-scale";

function InfoSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid #8798AA" }}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between px-4 py-3">
        <span className="font-bold uppercase" style={{ fontSize: 11.5, letterSpacing: "0.18em", color: "#6E7E96" }}>{title}</span>
        <ChevronRight className="h-4 w-4 transition-transform duration-200" style={{ color: "#6E7E96", transform: open ? "rotate(90deg)" : undefined }} />
      </button>
      {open ? <div className="px-4 pb-4 pt-3" style={{ borderTop: "1px solid #D3DDE7" }}>{children}</div> : null}
    </div>
  );
}

export function EEContextRail({
  howToRead,
  className,
  compact = false,
  extraLegend,
  scoreLegendLabel,
  scoreLegendGradient: scoreLegendGradientOverride,
  scoreLegendMinLabel,
  scoreLegendMaxLabel,
  scoreLegendTicks,
  scoreLegendBands,
  deltaLegendGradient: deltaLegendGradientOverride,
  scale,
}: {
  howToRead: string;
  className?: string;
  compact?: boolean;
  extraLegend?: React.ReactNode;
  scoreLegendLabel?: string;
  scoreLegendGradient?: string;
  scoreLegendMinLabel?: string;
  scoreLegendMaxLabel?: string;
  scoreLegendTicks?: React.ReactNode;
  scoreLegendBands?: React.ReactNode;
  deltaLegendGradient?: string;
  scale?: { min: number; max: number };
}) {
  const scoreGradient = scoreLegendGradientOverride ?? "linear-gradient(90deg, #D7B35A 0%, #FFFFFF 50%, #3F5F86 100%)";
  const deltaGradient = deltaLegendGradientOverride ?? "linear-gradient(90deg, #D46A6A 0%, #F5EFEF 50%, #59885D 100%)";
  const scoreMinLabel = scoreLegendMinLabel ?? (scale ? String(scale.min) : "60");
  const scoreMaxLabel = scoreLegendMaxLabel ?? (scale ? String(scale.max) : "85");
  return (
    <div className={className ?? "flex flex-col gap-3"}>
      <div className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid #8798AA" }}>
        <div className="flex w-full items-center justify-between px-4 py-3">
          <span className="font-bold uppercase" style={{ fontSize: 11.5, letterSpacing: "0.18em", color: "#6E7E96" }}>Legend</span>
        </div>
        <div className="px-4 pb-4 pt-3" style={{ borderTop: "1px solid #D3DDE7" }}>
        <div className="flex flex-col gap-3">
          <div>
            <p style={{ margin: "0 0 8px 0", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6E7E96" }}>
              {scoreLegendLabel ?? "Score Scale"}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#6E7E96]">{scoreMinLabel}</span>
              <div className="h-3.5 flex-1 rounded-2xl border border-[#8798AA]" style={{ background: scoreGradient }} />
              <span className="text-[11px] font-semibold text-[#6E7E96]">{scoreMaxLabel}</span>
            </div>
            {scoreLegendTicks ? <div className="mt-1.5">{scoreLegendTicks}</div> : null}
            {scoreLegendBands ? <div className="mt-2">{scoreLegendBands}</div> : null}
          </div>
          <div>
            <p style={{ margin: "0 0 8px 0", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6E7E96" }}>
              Delta / Diff Scale
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#6E7E96]">Decline</span>
              <div
                className="h-3.5 flex-1 rounded-2xl border border-[#8798AA]"
                style={{ background: deltaGradient }}
              />
              <span className="text-[11px] font-semibold text-[#6E7E96]">Gain</span>
            </div>
          </div>
          {extraLegend ? (
            <div>
              <p style={{ margin: "0 0 8px 0", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6E7E96" }}>
                Comparison Marker
              </p>
              {extraLegend}
            </div>
          ) : null}
        </div>
        </div>
      </div>
      <InfoSection title="How To Read" defaultOpen>
        <p style={{ margin: 0, fontSize: compact ? 11.5 : 12, lineHeight: 1.5, color: "#3B4B63" }}>
          {howToRead}
        </p>
      </InfoSection>
    </div>
  );
}
