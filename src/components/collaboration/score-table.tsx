"use client";

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

function indicatorColor(value: number, min: number, mid: number, max: number): string {
  if (value <= min) return "#e8a0a0";
  if (value >= max) return "#2d8f8f";
  if (value < mid) {
    const t = (value - min) / (mid - min);
    const r = Math.round(232 - t * 40);
    const g = Math.round(160 + t * 50);
    const b = Math.round(160 + t * 50);
    return `rgb(${r},${g},${b})`;
  }
  const t = (value - mid) / (max - mid);
  const r = Math.round(170 - t * 125);
  const g = Math.round(210 - t * 67);
  const b = Math.round(210 - t * 67);
  return `rgb(${r},${g},${b})`;
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
                          backgroundColor: indicatorColor(
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
                      backgroundColor: indicatorColor(
                        row.score,
                        minValue,
                        midpoint,
                        maxValue
                      ),
                      color: row.score > midpoint + 0.5 || row.score < midpoint - 0.5 ? "#fff" : "#334155",
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
