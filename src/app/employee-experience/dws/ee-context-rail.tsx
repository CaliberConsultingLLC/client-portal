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
}: {
  howToRead: string;
  className?: string;
  compact?: boolean;
  extraLegend?: React.ReactNode;
}) {
  return (
    <div className={className ?? "flex flex-col gap-3"}>
      <InfoSection title="How To Read" defaultOpen>
        <p style={{ margin: 0, fontSize: compact ? 11.5 : 12, lineHeight: 1.5, color: "#3B4B63" }}>
          {howToRead}
        </p>
      </InfoSection>
      <InfoSection title="Legend" defaultOpen={false}>
        <div className="flex flex-col gap-3">
          <div>
            <p style={{ margin: "0 0 8px 0", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6E7E96" }}>
              Score Scale (Blue-Red)
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#6E7E96]">60</span>
              <div className="h-3.5 flex-1 rounded-2xl border border-[#8798AA]" style={{ background: scoreScaleLegendGradient }} />
              <span className="text-[11px] font-semibold text-[#6E7E96]">85</span>
            </div>
          </div>
          <div>
            <p style={{ margin: "0 0 8px 0", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6E7E96" }}>
              Delta Scale (Red-Green)
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#6E7E96]">Decline</span>
              <div
                className="h-3.5 flex-1 rounded-2xl border border-[#8798AA]"
                style={{ background: "linear-gradient(90deg,#B49F9C 0%,#C8B9B6 30%,#E2E8EF 50%,#B5C5BE 70%,#8BA399 100%)" }}
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
      </InfoSection>
    </div>
  );
}
