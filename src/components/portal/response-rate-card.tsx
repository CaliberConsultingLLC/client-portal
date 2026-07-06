"use client";

import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";

export interface ResponseRateSummary {
  responseRate: number;
  respondedCount: number;
  totalRecipients: number;
  targetResponseRate: number;
  activeCampaignCount: number;
  primaryLabel: string;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function ResponseRateCard({
  responseRate,
  respondedCount,
  totalRecipients,
  targetResponseRate,
  activeCampaignCount,
  primaryLabel,
}: ResponseRateSummary) {
  const rate = clampPercent(responseRate);
  const target = clampPercent(targetResponseRate);
  const metTarget = target > 0 && rate >= target;
  const gaugeColor = metTarget ? "#386B45" : "#D7B35A";

  const data = [{ name: "Response Rate", value: rate, fill: gaugeColor }];

  return (
    <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#60727D]">
            Live Response Rate
          </p>
          <span className="rounded-full bg-[#F3F5F1] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4E5E52]">
            Updated daily
          </span>
        </div>

        <div className="mt-4 grid items-center gap-6 sm:grid-cols-[180px_1fr]">
          <div className="relative mx-auto h-[180px] w-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="74%"
                outerRadius="100%"
                data={data}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background={{ fill: "#EDF1ED" }} dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-semibold text-[#2B2B2B]">{rate}%</span>
              <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                Responded
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#2B2B2B]">{primaryLabel}</p>
              <p className="mt-1 text-sm leading-relaxed text-[#60727D]">
                {respondedCount} of {totalRecipients} recipients have responded
                {activeCampaignCount > 1
                  ? ` across ${activeCampaignCount} active campaigns`
                  : ""}
                .
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#E5EBEF] bg-[#F8FAFB] px-4 py-3">
                <p className="text-lg font-bold text-[#2B2B2B]">{target}%</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                  Target
                </p>
              </div>
              <div className="rounded-2xl border border-[#E5EBEF] bg-[#F8FAFB] px-4 py-3">
                <p
                  className={`text-lg font-bold ${metTarget ? "text-[#386B45]" : "text-[#2B2B2B]"}`}
                >
                  {metTarget ? "On track" : `${Math.max(target - rate, 0)} pts`}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                  {metTarget ? "Status" : "To target"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
