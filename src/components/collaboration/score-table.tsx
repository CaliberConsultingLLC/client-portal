"use client";
import {
  scoreScaleColor,
  scoreScaleTextColor,
} from "@/components/collaboration/score-color-scale";

interface ScoreTableRow {
  label: string;
  score: number;
}

interface ScoreTableProps {
  title: string;
  headers: [string, string];
  rows: ScoreTableRow[];
  minValue?: number;
  maxValue?: number;
  midpoint?: number;
  showIndicator?: boolean;
  className?: string;
}

export function ScoreTable({
  title,
  headers,
  rows,
  minValue = 5.0,
  maxValue = 9.0,
  midpoint = 7.0,
  showIndicator = false,
  className,
}: ScoreTableProps) {
  return (
    <div className={`rounded-xl border border-border-default bg-white ${className ?? ""}`}>
      <div className="border-b border-border-subtle px-4 py-3">
        <h3 className="text-sm font-bold text-text-primary">{title}</h3>
      </div>
      <div className="max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface-3">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                {headers[0]}
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">
                {headers[1]}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.label}
                className={`border-t border-border-subtle ${
                  i % 2 === 0 ? "bg-white" : "bg-surface-2/50"
                }`}
              >
                <td className="px-4 py-2 text-text-primary">
                  <div className="flex items-center gap-2">
                    {showIndicator && (
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor: scoreScaleColor(
                            row.score,
                            minValue,
                            midpoint,
                            maxValue
                          ),
                        }}
                      />
                    )}
                    <span className="text-[13px]">{row.label}</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  <span
                    className="inline-block min-w-[40px] rounded px-2 py-0.5 text-center text-xs font-bold"
                    style={{
                      backgroundColor: scoreScaleColor(
                        row.score,
                        minValue,
                        midpoint,
                        maxValue
                      ),
                      color: scoreScaleTextColor(row.score, midpoint),
                    }}
                  >
                    {row.score.toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
