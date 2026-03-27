"use client";
import { scoreScaleLegendGradient } from "@/components/collaboration/score-color-scale";

export function ColorLegend({
  className,
  minLabel = "3",
  maxLabel = "9",
}: {
  className?: string;
  minLabel?: string;
  maxLabel?: string;
}) {
  return (
    <div className={`flex items-center gap-2 text-xs text-text-secondary ${className ?? ""}`}>
      <span className="font-semibold">{minLabel}</span>
      <div
        className="h-3.5 w-36 rounded-2xl border border-border-strong"
        style={{
          background: scoreScaleLegendGradient,
        }}
      />
      <span className="font-semibold">{maxLabel}</span>
    </div>
  );
}
