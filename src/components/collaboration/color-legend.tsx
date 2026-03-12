"use client";
import { scoreScaleLegendGradient } from "@/components/collaboration/score-color-scale";

/** Gradient color legend matching the CDRS score range (5.0 red → 7.0 champagne → 9.0 green) */
export function ColorLegend({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs text-text-secondary ${className ?? ""}`}>
      <span className="font-semibold">5.00</span>
      <div
        className="h-3.5 w-24 rounded-sm"
        style={{
          background: scoreScaleLegendGradient,
        }}
      />
      <span className="font-semibold">9.00</span>
      <span className="ml-1 text-text-muted">7.00</span>
    </div>
  );
}
