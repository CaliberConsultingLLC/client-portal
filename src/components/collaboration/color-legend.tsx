"use client";

/** Gradient color legend matching the CDRS score range (5.0 red → 7.0 → 9.0 teal) */
export function ColorLegend({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs text-text-secondary ${className ?? ""}`}>
      <span className="font-semibold">5.00</span>
      <div
        className="h-3.5 w-24 rounded-sm"
        style={{
          background: "linear-gradient(to right, #e8a0a0, #d4c0c0, #aad2d2, #2d8f8f)",
        }}
      />
      <span className="font-semibold">9.00</span>
      <span className="ml-1 text-text-muted">7.00</span>
    </div>
  );
}
