"use client";

import { useRef, useState, type ReactNode } from "react";
import { Download } from "lucide-react";

interface SingleVisualExportFrameProps {
  filename: string;
  label?: string;
  enabled?: boolean;
  children: ReactNode;
}

export function SingleVisualExportFrame({
  filename,
  label = "Download",
  enabled = true,
  children,
}: SingleVisualExportFrameProps) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  if (!enabled) {
    return <>{children}</>;
  }

  async function handleDownload() {
    if (!captureRef.current) {
      return;
    }

    setBusy(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(captureRef.current, {
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
      setBusy(false);
    }
  }

  return (
    <div className="group relative">
      <div ref={captureRef}>{children}</div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] flex justify-center">
        <button
          type="button"
          onClick={handleDownload}
          disabled={busy}
          aria-label={busy ? "Exporting visual" : `${label} this visual as PNG`}
          className="pointer-events-auto flex translate-y-0 items-center gap-2 rounded-full border border-[#8798AA] bg-white px-4 py-2 text-sm font-semibold text-[#386B45] opacity-0 shadow-[0_10px_24px_rgba(15,23,42,.18)] transition-all duration-200 ease-out group-hover:translate-y-1/2 group-hover:opacity-100 focus-visible:translate-y-1/2 focus-visible:opacity-100"
        >
          <Download className="h-4 w-4 shrink-0" />
          {busy ? "Exporting…" : label}
        </button>
      </div>
    </div>
  );
}
