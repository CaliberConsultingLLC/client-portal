import type { VisualExportMeta } from "@/components/dashboard/visual-export-registry";

interface CompositeVisual {
  node: HTMLElement;
  label?: string;
}

const CANVAS_BG = "#ffffff";
const SCALE = 2;
// Device-pixel measurements (canvases are already rendered at SCALE).
const PAD = 56;
const GAP = 44;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Loads a logo with CORS so it can be drawn without tainting the canvas. */
function loadLogo(url?: string): Promise<string | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    const timeout = window.setTimeout(() => resolve(null), 4000);
    image.onload = () => {
      window.clearTimeout(timeout);
      resolve(url);
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      resolve(null);
    };
    image.src = url;
  });
}

/**
 * Renders the report header as a real off-screen DOM node (so it inherits the
 * app font and can include the client logo via CORS), then rasterizes it.
 */
async function renderHeaderCanvas(
  toCanvas: typeof import("html-to-image").toCanvas,
  meta: VisualExportMeta,
  cssWidth: number
): Promise<HTMLCanvasElement | null> {
  if (!meta.title) return null;

  const subtitle = [meta.client, ...(meta.filters ?? [])]
    .filter((part): part is string => Boolean(part && part.trim()))
    .map(escapeHtml)
    .join("&nbsp;&nbsp;·&nbsp;&nbsp;");

  const generated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const logoSrc = await loadLogo(meta.logoUrl);
  const logoMarkup = logoSrc
    ? `<img src="${escapeHtml(logoSrc)}" crossorigin="anonymous" style="height:44px;width:auto;object-fit:contain;display:block" />`
    : "";

  const host = document.createElement("div");
  host.style.cssText = [
    "position:fixed",
    "left:-99999px",
    "top:0",
    `width:${Math.round(cssWidth)}px`,
    "background:#ffffff",
    "box-sizing:border-box",
  ].join(";");

  host.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px">
      <div style="min-width:0">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
          ${logoMarkup}
          <div style="font-size:30px;font-weight:800;color:#152238;letter-spacing:-0.01em;line-height:1.1">${escapeHtml(
            meta.title
          )}</div>
        </div>
        <div style="height:3px;width:66px;background:#386B45;border-radius:999px;margin-bottom:13px"></div>
        ${
          subtitle
            ? `<div style="font-size:15px;font-weight:500;color:#60727D;line-height:1.4">${subtitle}</div>`
            : ""
        }
      </div>
      <div style="font-size:12px;font-weight:600;color:#8798AA;white-space:nowrap;text-transform:uppercase;letter-spacing:0.08em;padding-top:4px">Generated ${escapeHtml(
        generated
      )}</div>
    </div>
    <div style="height:1px;background:#D3DDE7;margin-top:20px"></div>
  `;

  document.body.appendChild(host);
  try {
    return await toCanvas(host, {
      backgroundColor: CANVAS_BG,
      pixelRatio: SCALE,
      cacheBust: true,
    });
  } finally {
    document.body.removeChild(host);
  }
}

/**
 * Captures each visual individually at high scale, then stitches them onto a
 * single tall canvas under a generated header. This keeps every visual crisp
 * instead of rasterizing one giant, squished DOM node.
 */
export async function exportCompositeVisuals({
  visuals,
  meta,
  filename,
  skipGeneratedHeader = false,
}: {
  visuals: CompositeVisual[];
  meta: VisualExportMeta;
  filename: string;
  /**
   * Skips the synthesized title/logo header block. Use this when one of the
   * registered visuals already IS a real, captured screenshot of the page's
   * own header (e.g. the field-redesign shell registers its live title/KPI/
   * gradient header) — otherwise the title ends up printed twice.
   */
  skipGeneratedHeader?: boolean;
}) {
  if (visuals.length === 0) return;

  // html-to-image renders via SVG foreignObject (the real browser paints the
  // DOM), so text baselines, grid/flex centering, and fonts match the screen.
  const { toCanvas } = await import("html-to-image");

  const rendered: HTMLCanvasElement[] = [];
  for (const visual of visuals) {
    // Applies export-only styling (e.g. unclamped chart labels) during capture
    // without altering the live dashboard rendering.
    visual.node.classList.add("ee-export-mode");
    try {
      const canvas = await toCanvas(visual.node, {
        backgroundColor: CANVAS_BG,
        pixelRatio: SCALE,
        cacheBust: true,
      });
      rendered.push(canvas);
    } finally {
      visual.node.classList.remove("ee-export-mode");
    }
  }

  const visualWidth = Math.max(...rendered.map((canvas) => canvas.width));
  const headerCanvas = skipGeneratedHeader
    ? null
    : await renderHeaderCanvas(toCanvas, meta, visualWidth / SCALE);

  const blocks = headerCanvas ? [headerCanvas, ...rendered] : rendered;
  const contentWidth = Math.max(...blocks.map((canvas) => canvas.width));

  const totalWidth = contentWidth + PAD * 2;
  const totalHeight =
    PAD * 2 +
    blocks.reduce(
      (sum, canvas, index) => sum + canvas.height + (index > 0 ? GAP : 0),
      0
    );

  const out = document.createElement("canvas");
  out.width = totalWidth;
  out.height = totalHeight;

  const ctx = out.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = CANVAS_BG;
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  let y = PAD;
  blocks.forEach((canvas, index) => {
    if (index > 0) y += GAP;
    // Header spans the full width; individual visuals are centered so both
    // margins stay straight top-to-bottom.
    const x =
      headerCanvas && index === 0
        ? PAD
        : Math.round((totalWidth - canvas.width) / 2);
    ctx.drawImage(canvas, x, y);
    y += canvas.height;
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = out.toDataURL("image/png");
  link.click();
}
