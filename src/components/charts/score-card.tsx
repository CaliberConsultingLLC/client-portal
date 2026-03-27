"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  formatScoreDeltaForDisplay,
  formatScoreForDisplay,
} from "@/lib/collaboration/display-format";

interface ScoreCardProps {
  label: string;
  value: number;
  maxValue?: number;
  previousValue?: number;
  suffix?: string;
  color?: string;
  className?: string;
}

export function ScoreCard({
  label,
  value,
  maxValue = 100,
  previousValue,
  suffix = "",
  color = "var(--color-nsp-blue-500)",
  className,
}: ScoreCardProps) {
  const percentage = Math.round((value / maxValue) * 100);
  const delta =
    previousValue !== undefined ? value - previousValue : undefined;

  return (
    <div className={cn("rounded-xl border border-border bg-white p-5", className)}>
      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <div className="mt-2 flex items-end gap-2">
        <span
          className="text-3xl font-extrabold"
          style={{ color }}
        >
          {formatScoreForDisplay(value)}
          {suffix}
        </span>
        {delta !== undefined && (
          <span
            className={cn(
              "mb-1 flex items-center gap-0.5 text-xs font-semibold",
              delta > 0
                ? "text-nsp-green-600"
                : delta < 0
                ? "text-nsp-red-500"
                : "text-text-muted"
            )}
          >
            {delta > 0 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : delta < 0 ? (
              <TrendingDown className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
            {delta > 0 ? "+" : ""}
            {formatScoreDeltaForDisplay(delta)}
          </span>
        )}
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <p className="mt-1 text-right text-[10px] text-text-muted">
        {percentage}% of {maxValue}
      </p>
    </div>
  );
}
