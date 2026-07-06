"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVisualExportRegistry } from "./visual-export-registry";
import { exportCompositeVisuals } from "@/lib/dashboard/composite-visuals";

interface CompositeVisualExportButtonProps {
  filename: string;
  logoUrl?: string;
  className?: string;
  /**
   * DWS Field redesign pilot only: instead of a plain icon-only circle, the
   * button expands into a pill with a text label on hover. Defaults to off
   * so every other caller keeps the original icon-only treatment.
   */
  expandOnHover?: boolean;
  expandLabel?: string;
  /**
   * DWS Field redesign pilot only: render as a full-width card row matching
   * the look of the other Context-tab boxes (`EmbeddedFilterCard`'s outer
   * border/radius/background/padding + its uppercase label styling) instead
   * of a circular icon button. Used to move the report-level download out of
   * the header and into the Context tab.
   */
  asContextCard?: boolean;
  /** Forwarded to exportCompositeVisuals — see its doc comment. */
  skipGeneratedHeader?: boolean;
}

/**
 * Page-level export. Composites every registered visual (in order) into one
 * stitched PNG under a generated header, instead of a single flat capture.
 */
export function CompositeVisualExportButton({
  filename,
  logoUrl,
  className,
  expandOnHover = false,
  expandLabel = "Download report",
  asContextCard = false,
  skipGeneratedHeader = false,
}: CompositeVisualExportButtonProps) {
  const registry = useVisualExportRegistry();
  const [busy, setBusy] = useState(false);
  const [hovered, setHovered] = useState(false);

  async function handleExport() {
    if (!registry) return;

    const visuals = registry
      .getOrderedVisuals()
      .map((visual) => ({ node: visual.getNode(), label: visual.label }))
      .filter(
        (visual): visual is { node: HTMLElement; label: string } =>
          Boolean(visual.node)
      );

    if (visuals.length === 0) {
      alert("No visuals are available to export on this view yet.");
      return;
    }

    setBusy(true);
    try {
      await exportCompositeVisuals({
        visuals,
        meta: { ...registry.getMeta(), logoUrl },
        filename,
        skipGeneratedHeader,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to export report.");
    } finally {
      setBusy(false);
    }
  }

  if (asContextCard) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={handleExport}
        className={cn("transition-colors hover:bg-[#F5F8FA]", className)}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          borderRadius: 13,
          border: "1px solid #C8D2CF",
          background: "#fff",
          padding: "14px 13px",
          cursor: busy ? "default" : "pointer",
        }}
        aria-label={busy ? "Exporting report" : "Download full report as PNG"}
      >
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8798AA" }}>
          {busy ? "Exporting…" : "Download Report"}
        </span>
        <Download className="h-4 w-4 flex-shrink-0" style={{ color: "#386B45" }} />
      </button>
    );
  }

  if (!expandOnHover) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(
          "h-9 w-9 rounded-full border-[#8798AA] bg-white text-[#386B45] shadow-sm hover:bg-[#F5F8FA]",
          className
        )}
        disabled={busy}
        onClick={handleExport}
        aria-label={busy ? "Exporting report" : "Download full report as PNG"}
        title={busy ? "Exporting…" : "Download full report"}
      >
        <Download className="h-4 w-4" />
      </Button>
    );
  }

  const label = busy ? "Exporting…" : expandLabel;
  return (
    <Button
      type="button"
      variant="outline"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className={cn(
        "flex h-9 items-center justify-center overflow-hidden rounded-full border-[#8798AA] bg-white text-[#386B45] shadow-sm transition-all duration-200 ease-out hover:bg-[#F5F8FA]",
        // No gap while collapsed — otherwise the reserved space for the
        // (invisible) label pushes the icon off-center in the circle.
        hovered ? "w-auto max-w-[220px] gap-2 px-4" : "w-9 max-w-9 gap-0 px-0",
        className
      )}
      disabled={busy}
      onClick={handleExport}
      aria-label={label}
      title={label}
    >
      <Download className="h-4 w-4 flex-shrink-0" />
      <span
        className={cn(
          "overflow-hidden whitespace-nowrap text-[13px] font-semibold transition-all duration-200 ease-out",
          hovered ? "max-w-[180px] opacity-100" : "max-w-0 opacity-0"
        )}
      >
        {label}
      </span>
    </Button>
  );
}
