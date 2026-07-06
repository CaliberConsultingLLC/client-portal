"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VisualExportButtonProps {
  targetId: string;
  filename?: string;
  className?: string;
  iconOnly?: boolean;
}

export function VisualExportButton({
  targetId,
  filename = "dashboard-visual.png",
  className,
  iconOnly = false,
}: VisualExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  async function exportVisual() {
    const target = document.getElementById(targetId);
    if (!target) {
      alert("Export target not found on this page.");
      return;
    }

    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(target, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to export visual.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={iconOnly ? "icon" : "sm"}
      className={cn(
        iconOnly
          ? "h-9 w-9 rounded-full border-[#8798AA] bg-white text-[#386B45] shadow-sm hover:bg-[#F5F8FA]"
          : "rounded-full border-[#8798AA]",
        className
      )}
      disabled={exporting}
      onClick={exportVisual}
      aria-label={exporting ? "Exporting visual" : "Download current view as PNG"}
      title={exporting ? "Exporting…" : "Download PNG"}
    >
      <Download className="h-4 w-4" />
      {!iconOnly ? (exporting ? "Exporting…" : "Export PNG") : null}
    </Button>
  );
}
