"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

function RailSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
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

function toggleStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: "#2B2B2B", color: "#fff", border: "1px solid #2B2B2B" }
    : { background: "#fff", color: "#3B4B63", border: "1px solid #D4DAD6" };
}

export type EEExecutiveComparison = { id: string; label: string; labelLong: string };
export type EEExecutiveIndex = { id: string; name: string };

export function EEExecutiveRail({
  logoUrl,
  clientName,
  perspectiveTitle,
  comparisonHint,
  campaigns,
  current,
  prior,
  onCurrent,
  onPrior,
  comparisons,
  compId,
  onCompId,
  indexes,
  indexId,
  onIndexId,
  locations,
  location,
  onLocation,
  extraSections,
}: {
  logoUrl?: string;
  clientName: string;
  perspectiveTitle: string;
  comparisonHint?: string;
  campaigns: string[];
  current: string;
  prior: string;
  onCurrent: (value: string) => void;
  onPrior: (value: string) => void;
  comparisons: EEExecutiveComparison[];
  compId: string;
  onCompId: (value: string) => void;
  indexes: EEExecutiveIndex[];
  indexId: string;
  onIndexId: (value: string) => void;
  locations: string[];
  location: string;
  onLocation: (value: string) => void;
  extraSections?: React.ReactNode;
}) {
  const comp = comparisons.find((item) => item.id === compId) ?? comparisons[0];

  return (
    <aside
      className="flex flex-col gap-4 p-6"
      style={{
        position: "fixed",
        top: "calc(var(--app-top-banner-height,78px) + 66px)",
        bottom: 0,
        left: 0,
        width: 268,
        overflow: "auto",
        background: "#E8ECE9",
        borderRight: "1px solid #D4DAD6",
      }}
    >
      <div className="rounded-[18px] bg-white p-4 text-center" style={{ border: "1px solid #8798AA", boxShadow: "0 2px 8px rgba(15,23,42,.07)" }}>
        <img src={logoUrl ?? "/canopy-services-logo.png"} alt={`${clientName} logo`} className="mx-auto h-auto w-[180px]" />
        <div className="mt-3 font-bold uppercase" style={{ fontSize: 11.5, letterSpacing: "0.1em", color: "#152238" }}>{perspectiveTitle}</div>
        {comp ? (
          <div className="mt-0.5 italic" style={{ fontSize: 10.5, color: "#6E7E96" }}>
            {comparisonHint ?? `(compared to ${comp.labelLong})`}
          </div>
        ) : null}
      </div>

      <RailSection title="Campaign Selection">
        <div className="flex flex-col gap-3">
          <div>
            <span className="block text-center text-xs font-medium text-[#6E7E96]">Current</span>
            <select
              value={current}
              onChange={(event) => onCurrent(event.target.value)}
              className="mt-1.5 w-full rounded-[11px] border border-[#D4DAD6] bg-white px-3 py-2.5 text-center text-sm font-semibold text-[#152238] focus:border-[#8798AA] focus:outline-none"
            >
              {[...campaigns].reverse().map((campaign) => (
                <option key={campaign} value={campaign}>{campaign}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="block text-center text-xs font-medium text-[#6E7E96]">Compared To</span>
            <select
              value={prior}
              onChange={(event) => onPrior(event.target.value)}
              className="mt-1.5 w-full rounded-[11px] border border-[#D4DAD6] bg-white px-3 py-2.5 text-center text-sm text-[#152238] focus:border-[#8798AA] focus:outline-none"
            >
              <option value="">No comparison</option>
              {[...campaigns].reverse().filter((campaign) => campaign !== current).map((campaign) => (
                <option key={campaign} value={campaign}>{campaign}</option>
              ))}
            </select>
          </div>
        </div>
      </RailSection>

      {indexes.length > 0 ? (
        <RailSection title="Index">
          <div className="flex flex-col gap-2">
            {indexes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onIndexId(item.id)}
                className="w-full rounded-[11px] px-3 py-2.5 text-center text-sm font-semibold transition-colors"
                style={toggleStyle(indexId === item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
        </RailSection>
      ) : null}

      {locations.length > 0 ? (
        <RailSection title="Brand">
          <select
            value={location}
            onChange={(event) => onLocation(event.target.value)}
            className="w-full rounded-[11px] border border-[#D4DAD6] bg-white px-3 py-2.5 text-center text-sm font-semibold text-[#152238] focus:border-[#8798AA] focus:outline-none"
          >
            <option value="">All brands</option>
            {locations.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </RailSection>
      ) : null}

      {extraSections}
    </aside>
  );
}

export const EE_PERSPECTIVE_CANVAS_STYLE = {
  minHeight: "calc(100vh - var(--app-top-banner-height,78px) - 66px)",
  background: "linear-gradient(90deg,#E8ECE9 0 268px,#fff 268px calc(100% - 268px),#E8ECE9 calc(100% - 268px) 100%)",
} as const;

export const EE_PERSPECTIVE_MAIN_STYLE = {
  minHeight: "calc(100vh - var(--app-top-banner-height,78px) - 66px)",
  marginLeft: 268,
  marginRight: 268,
  background: "#fff",
  padding: "30px 30px 56px",
} as const;

export const EE_GUIDANCE_RAIL_STYLE: React.CSSProperties = {
  position: "fixed",
  top: "calc(var(--app-top-banner-height,78px) + 66px)",
  right: 0,
  bottom: 0,
  width: 268,
  overflow: "auto",
  background: "#E8ECE9",
  borderLeft: "1px solid #D4DAD6",
};
