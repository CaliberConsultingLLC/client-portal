"use client";

import { VisualExportButton } from "@/components/dashboard/visual-export-button";

interface DashboardVisualExportToolbarProps {
  targetId: string;
  filename: string;
}

export function DashboardVisualExportToolbar({
  targetId,
  filename,
}: DashboardVisualExportToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <p className="text-xs text-[#60727D]">
        Export the current view as a PNG for slides, email, or readout assembly.
      </p>
      <VisualExportButton targetId={targetId} filename={filename} iconOnly />
    </div>
  );
}
