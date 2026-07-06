"use client";

// ─── IndexTabRail ─────────────────────────────────────────────────────────────
// A vertical, single-select tab column that visually connects into the chart /
// content card sitting to its right. The active tab is white and "feeds into"
// the card (its right border drops out and it overlaps the card edge); inactive
// tabs read as recessed. The rail stretches to the card height and is inset from
// the top/bottom so tabs meet the card along its straight edge (clearing rounded
// corners).
//
// Usage: place as the FIRST child of a flex row with `alignItems: "stretch"` and
// `gap: 0`; the card is the second child with `flex: 1`.

import { KIT_BORDER } from "./colors";

export interface IndexTabRailItem {
  id: string;
  label: string;
}

export function IndexTabRail({
  items,
  activeId,
  onSelect,
  width = 168,
  cornerInset = 16,
}: {
  items: IndexTabRailItem[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Column width in px. */
  width?: number;
  /** Top/bottom inset so tabs clear the card's rounded corners. */
  cornerInset?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        width,
        flexShrink: 0,
        paddingTop: cornerInset,
        paddingBottom: cornerInset,
      }}
    >
      {items.map((item, index) => {
        const active = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "0 12px",
              borderTopLeftRadius: 12,
              borderBottomLeftRadius: 12,
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              cursor: "pointer",
              fontSize: 13,
              lineHeight: 1.2,
              transition: "all .16s",
              position: "relative",
              marginBottom: index === items.length - 1 ? 0 : -1,
              ...(active
                ? {
                    background: "#fff",
                    color: "#1E2329",
                    fontWeight: 800,
                    border: `1px solid ${KIT_BORDER}`,
                    borderRight: "none",
                    marginRight: -1,
                    zIndex: 2,
                    boxShadow: "-1px 0 3px rgba(15,23,42,.05)",
                  }
                : {
                    background: "#EEF2F6",
                    color: "#5A6B82",
                    fontWeight: 600,
                    border: "1px solid #D4DAD6",
                    zIndex: 1,
                  }),
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
