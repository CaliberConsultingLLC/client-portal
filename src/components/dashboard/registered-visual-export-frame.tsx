"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Download } from "lucide-react";
import {
  useVisualExportRegistry,
  useVisualRegistryActive,
} from "./visual-export-registry";

/**
 * Per-visual download button style. Defaults to "pill" (the original
 * labeled button that pulls out below the visual) everywhere. The layout-
 * redesign pilot shell (`FieldRedesignShell`) provides "corner" for every
 * report it renders, switching every `RegisteredVisualExportFrame` inside it
 * to a small icon-only circle in the visual's upper-right corner — without
 * having to touch each of the many call sites individually. Consumers
 * outside the redesign pilot (Collaboration, Integration Effectiveness,
 * etc.) never see this context set, so they keep today's pill button.
 */
export type VisualExportButtonStyle = "pill" | "corner";
const VisualExportButtonStyleContext = createContext<VisualExportButtonStyle>("pill");
export const VisualExportButtonStyleProvider = VisualExportButtonStyleContext.Provider;

interface RegisteredVisualExportFrameProps {
  order: number;
  label: string;
  filename: string;
  /** Explicit override; when omitted, follows the dashboard-level active flag. */
  enabled?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Same registration as RegisteredVisualExportFrame, minus the per-visual pull
 * -out download button. Use this for chrome-level content (page header
 * stats, etc.) that should be captured in the composite "download report"
 * PNG but isn't a standalone visual a user would want its own button for.
 */
export function SilentVisualExportFrame({
  order,
  label,
  enabled,
  className,
  style,
  children,
}: {
  order: number;
  label: string;
  enabled?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const registry = useVisualExportRegistry();
  const active = useVisualRegistryActive();
  const isEnabled = enabled ?? active;
  const autoId = useId();

  useEffect(() => {
    if (!isEnabled || !registry) return;
    return registry.registerVisual({
      id: autoId,
      order,
      label,
      getNode: () => captureRef.current,
    });
  }, [isEnabled, registry, autoId, order, label]);

  return (
    <div ref={captureRef} className={className} style={style}>
      {children}
    </div>
  );
}

/**
 * Wraps a single dashboard visual. When enabled it registers the visual with
 * the export registry (so the page-level button can composite all visuals) and
 * exposes a discrete, animated pull-out button to download just this visual.
 */
export function RegisteredVisualExportFrame({
  order,
  label,
  filename,
  enabled,
  className,
  style,
  children,
}: RegisteredVisualExportFrameProps) {
  const captureRef = useRef<HTMLDivElement>(null);
  const registry = useVisualExportRegistry();
  const active = useVisualRegistryActive();
  const isEnabled = enabled ?? active;
  const autoId = useId();
  const [busy, setBusy] = useState(false);
  const buttonStyle = useContext(VisualExportButtonStyleContext);

  useEffect(() => {
    if (!isEnabled || !registry) return;
    return registry.registerVisual({
      id: autoId,
      order,
      label,
      getNode: () => captureRef.current,
    });
  }, [isEnabled, registry, autoId, order, label]);

  if (!isEnabled) {
    return <div className={className} style={style}>{children}</div>;
  }

  async function handleDownload() {
    const node = captureRef.current;
    if (!node) return;
    setBusy(true);
    node.classList.add("ee-export-mode");
    try {
      // html-to-image renders via SVG foreignObject (the real browser paints the
      // DOM), so text baselines, grid/flex centering, and fonts match the screen.
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to export visual.");
    } finally {
      node.classList.remove("ee-export-mode");
      setBusy(false);
    }
  }

  return (
    <div
      className={className ? `group relative ${className}` : "group relative"}
      style={style}
    >
      <div ref={captureRef} style={{ height: "100%" }}>{children}</div>

      {buttonStyle === "corner" ? (
        // Icon-only circle straddling the visual's upper-right corner — no
        // label, appears only on hover, same recognizable download glyph
        // used everywhere else in the product.
        <button
          type="button"
          onClick={handleDownload}
          disabled={busy}
          aria-label={busy ? "Exporting visual" : `${label} as PNG`}
          className="absolute right-0 top-0 z-[5] flex h-9 w-9 -translate-y-1/2 translate-x-1/3 scale-90 items-center justify-center rounded-full border border-[#8798AA] bg-white text-[#386B45] opacity-0 shadow-[0_6px_16px_rgba(15,23,42,.18)] transition-all duration-150 ease-out group-hover:scale-100 group-hover:opacity-100 focus-visible:scale-100 focus-visible:opacity-100 disabled:opacity-70"
        >
          <Download className="h-4 w-4 shrink-0" />
        </button>
      ) : (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] flex justify-center">
          <button
            type="button"
            onClick={handleDownload}
            disabled={busy}
            aria-label={busy ? "Exporting visual" : `${label} as PNG`}
            className="pointer-events-auto flex translate-y-0 items-center gap-2 rounded-full border border-[#8798AA] bg-white px-4 py-2 text-sm font-semibold text-[#386B45] opacity-0 shadow-[0_10px_24px_rgba(15,23,42,.18)] transition-all duration-200 ease-out group-hover:translate-y-1/2 group-hover:opacity-100 focus-visible:translate-y-1/2 focus-visible:opacity-100"
          >
            <Download className="h-4 w-4 shrink-0" />
            {busy ? "Exporting…" : label}
          </button>
        </div>
      )}
    </div>
  );
}
