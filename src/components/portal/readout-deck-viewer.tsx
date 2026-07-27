"use client";

import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ReadoutEditableText, sanitizeReadoutHtml } from "@/components/portal/readout-editable-text";
import { ReadoutImageSlot } from "@/components/portal/readout-image-slot";
import {
  READOUT_COLOR_PRESETS,
  READOUT_DATAPOINT_SIZES,
  READOUT_FOCUS_ACCENT_DEFAULT,
  READOUT_FOCUS_ACCENTS,
  READOUT_PILL_PRESETS,
  READOUT_TEXT_SIZES,
  buildDashboardDeepLink,
  dashboardLinkFilterFields,
  romanNumeral,
} from "@/lib/readout/deck-constants";
import type { ReadoutDashboardLinkOptions } from "@/lib/readout/dashboard-link-options";
import {
  READOUT_COL_KEYS,
  activeColKeys,
  buildDefaultReadoutDeck,
  defaultWidths,
  emptySlideCols,
  normalizeColCount,
  normalizeReadoutDeck,
  normalizeWidths,
} from "@/lib/readout/default-deck";
import type {
  Readout,
  ReadoutBlock,
  ReadoutColCount,
  ReadoutColKey,
  ReadoutCover,
  ReadoutDashboardLink,
  ReadoutDataPointBlock,
  ReadoutDeck,
  ReadoutSlide,
  ReadoutSlideCols,
  ReadoutTextBlock,
  ReadoutVisualBlock,
} from "@/types/readout";
import type { ReactNode } from "react";

interface ReadoutDeckViewerProps {
  readout: Readout;
  clientName: string;
  clientLogoUrl: string;
  isInternalUser: boolean;
  dashboardLinkOptions?: ReadoutDashboardLinkOptions | null;
}

type DragState = { slideKey: string; blockId: string } | null;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ReadoutDeckViewer(props: ReadoutDeckViewerProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-var(--app-top-banner-height))] items-center justify-center bg-[#F3F5F2] text-sm text-[#6E7E96]">
          Loading readout…
        </div>
      }
    >
      <ReadoutDeckViewerInner {...props} />
    </Suspense>
  );
}

function ReadoutDeckViewerInner({
  readout: initialReadout,
  clientName,
  clientLogoUrl,
  isInternalUser,
  dashboardLinkOptions = null,
}: ReadoutDeckViewerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [readout, setReadout] = useState(initialReadout);
  const [deck, setDeck] = useState<ReadoutDeck>(() =>
    normalizeReadoutDeck(initialReadout.deck ?? buildDefaultReadoutDeck(clientName))
  );
  const [slide, setSlide] = useState(0);
  const [editing, setEditing] = useState(false);
  const [designMode, setDesignMode] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [busyAll, setBusyAll] = useState(false);
  const dragRef = useRef<DragState>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideRestoredRef = useRef(false);

  const onCover = slide === 0;
  const chromeVisible = !exporting;
  const designChrome = isInternalUser && designMode && !exporting;
  const handleVisible = designChrome && editing;
  const editable = designChrome && editing;

  const persistDeck = useCallback(
    (nextDeck: ReadoutDeck) => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(async () => {
        try {
          const response = await fetch(`/api/portal/readouts/${readout.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deck: nextDeck }),
          });
          const payload = (await response.json()) as { readout?: Readout };
          if (payload.readout) setReadout(payload.readout);
        } catch (error) {
          console.error("Failed to persist readout deck", error);
        }
      }, 400);
    },
    [readout.id]
  );

  const commitDeck = useCallback(
    (updater: (current: ReadoutDeck) => ReadoutDeck) => {
      setDeck((current) => {
        const next = normalizeReadoutDeck(updater(current));
        persistDeck(next);
        return next;
      });
    },
    [persistDeck]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editing) return;
      const tag = (document.activeElement?.tagName || "").toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const max = deck.order.length;
      if (e.key === "ArrowRight") setSlide((s) => Math.min(max, s + 1));
      if (e.key === "ArrowLeft") setSlide((s) => Math.max(0, s - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, deck.order.length]);

  useEffect(() => {
    function onEditMode(event: Event) {
      const detail = (event as CustomEvent<boolean>).detail;
      setEditing(Boolean(detail));
      setMenuOpen(false);
    }
    window.addEventListener("portal-readout-edit-mode", onEditMode as EventListener);
    return () => window.removeEventListener("portal-readout-edit-mode", onEditMode as EventListener);
  }, []);

  useEffect(() => {
    if (slideRestoredRef.current) return;
    const raw = searchParams?.get("slide");
    if (!raw || !/^\d+$/.test(raw)) {
      slideRestoredRef.current = true;
      return;
    }
    const next = Number(raw);
    const max = deck.order.length;
    if (Number.isFinite(next) && next >= 0 && next <= max) {
      setSlide(next);
    }
    slideRestoredRef.current = true;
  }, [deck.order.length, searchParams]);

  function patchCover(patch: Partial<ReadoutCover>) {
    commitDeck((d) => ({ ...d, cover: { ...d.cover, ...patch } }));
  }

  function patchSlide(key: string, patch: Partial<ReadoutSlide>) {
    commitDeck((d) => ({
      ...d,
      slides: { ...d.slides, [key]: { ...d.slides[key], ...patch } },
    }));
  }

  function updateBlock(slideKey: string, blockId: string, patch: Partial<ReadoutBlock>) {
    commitDeck((d) => {
      const sl = d.slides[slideKey];
      const existing = sl.blocks[blockId];
      return {
        ...d,
        slides: {
          ...d.slides,
          [slideKey]: {
            ...sl,
            blocks: {
              ...sl.blocks,
              [blockId]: { ...existing, ...patch } as ReadoutBlock,
            },
          },
        },
      };
    });
  }

  function removeBlock(slideKey: string, blockId: string) {
    commitDeck((d) => {
      const sl = d.slides[slideKey];
      const blocks = { ...sl.blocks };
      delete blocks[blockId];
      const cols = emptySlideCols();
      for (const key of READOUT_COL_KEYS) {
        cols[key] = sl.cols[key].filter((id) => id !== blockId);
      }
      return {
        ...d,
        slides: {
          ...d.slides,
          [slideKey]: { ...sl, blocks, cols },
        },
      };
    });
  }

  function findColForBlock(cols: ReadoutSlideCols, blockId: string): ReadoutColKey | null {
    for (const key of READOUT_COL_KEYS) {
      if (cols[key].includes(blockId)) return key;
    }
    return null;
  }

  function dropOn(slideKey: string, targetId: string | null, colIdx: number | null) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.slideKey !== slideKey) return;
    if (targetId === drag.blockId) return;
    commitDeck((d) => {
      const sl = d.slides[slideKey];
      const count = normalizeColCount(sl.colCount);
      const keys = activeColKeys(count);
      const cols = emptySlideCols();
      for (const key of READOUT_COL_KEYS) {
        cols[key] = sl.cols[key].filter((id) => id !== drag.blockId);
      }
      if (targetId) {
        const side = findColForBlock(cols, targetId) ?? keys[0];
        const idx = cols[side].indexOf(targetId);
        cols[side].splice(Math.max(0, idx), 0, drag.blockId);
      } else if (colIdx !== null) {
        const side = keys[Math.min(colIdx, keys.length - 1)] ?? "a";
        cols[side].push(drag.blockId);
      }
      return { ...d, slides: { ...d.slides, [slideKey]: { ...sl, cols } } };
    });
  }

  function addBlock(type: "visual" | "text" | "datapoint") {
    const key = deck.order[slide - 1];
    if (!key || !deck.slides[key]) return;
    const id = `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const block: ReadoutBlock =
      type === "visual"
        ? {
            type: "visual",
            slot: `slot-${id}`,
            sub: "New visual",
            persp: "Employee Experience",
            caption: "Describe what this visual shows.",
            imageUrl: null,
          }
        : type === "datapoint"
          ? {
              type: "datapoint",
              color: 1,
              size: 2,
              value: "67.7",
              subtitle: "Overall favorability",
            }
          : {
              type: "text",
              color: 1,
              subtitle: "New text",
              body: "Click Edit narrative, then click here to write this text.",
            };
    commitDeck((d) => {
      const sl = d.slides[key];
      const count = normalizeColCount(sl.colCount);
      const keys = activeColKeys(count);
      let best = keys[0];
      let bestLen = sl.cols[best].length;
      for (const colKey of keys) {
        if (sl.cols[colKey].length < bestLen) {
          best = colKey;
          bestLen = sl.cols[colKey].length;
        }
      }
      const cols = { ...sl.cols, [best]: [...sl.cols[best], id] };
      return {
        ...d,
        slides: {
          ...d.slides,
          [key]: { ...sl, cols, blocks: { ...sl.blocks, [id]: block } },
        },
      };
    });
    setMenuOpen(false);
  }

  function setSlideColCount(nextCount: ReadoutColCount) {
    const key = deck.order[slide - 1];
    if (!key || !deck.slides[key]) return;
    commitDeck((d) => {
      const sl = d.slides[key];
      const prevCount = normalizeColCount(sl.colCount);
      if (prevCount === nextCount) return d;
      const cols = { ...emptySlideCols(), ...normalizeSlideCols(sl.cols) };
      if (nextCount < prevCount) {
        const keep = activeColKeys(nextCount);
        const last = keep[keep.length - 1];
        for (const dropped of READOUT_COL_KEYS.slice(nextCount)) {
          cols[last] = [...cols[last], ...cols[dropped]];
          cols[dropped] = [];
        }
      }
      const widths = defaultWidths(nextCount);
      return {
        ...d,
        slides: {
          ...d.slides,
          [key]: {
            ...sl,
            colCount: nextCount,
            cols,
            widths,
            r: widths[0] ?? 0.5,
          },
        },
      };
    });
  }

  function addSlide() {
    const key = `sl${Date.now().toString(36)}`;
    const vId = `v-${key}`;
    const iId = `i-${key}`;
    const meta: ReadoutSlide = {
      label: "New chapter",
      pill: "Draft",
      pillBg: "#FBF5E3",
      pillFg: "#8A6A1F",
      dot: "#C99A3C",
      headline: "Click Edit narrative to write this headline.",
      blurb: "Describe this chapter in one line.",
      r: 0.68,
      colCount: 2,
      widths: [0.68, 0.32],
      cols: { a: [vId], b: [iId], c: [], d: [] },
      blocks: {
        [vId]: {
          type: "visual",
          slot: `slot-${vId}`,
          sub: "New visual",
          persp: "Employee Experience",
          caption: "Describe what this visual shows.",
          imageUrl: null,
        },
        [iId]: {
          type: "text",
          color: 6,
          subtitle: "",
          body: "Click Edit narrative, then click here to write this text.",
        },
      },
    };
    commitDeck((d) => ({
      ...d,
      slides: { ...d.slides, [key]: meta },
      order: [...d.order, key],
    }));
    setSlide(deck.order.length + 1);
    setMenuOpen(false);
  }

  function removeSlide(slideKey: string) {
    if (!editable) return;
    commitDeck((d) => {
      if (!d.order.includes(slideKey) || d.order.length <= 1) return d;
      const nextOrder = d.order.filter((key) => key !== slideKey);
      const nextSlides = { ...d.slides };
      delete nextSlides[slideKey];
      return { ...d, order: nextOrder, slides: nextSlides };
    });
    setPendingDeleteKey(null);
    setSlide(0);
    setMenuOpen(false);
  }

  function startColResize(slideKey: string, handleIndex: number, e: React.MouseEvent<HTMLDivElement>) {
    if (!editing) return;
    e.preventDefault();
    const grid = e.currentTarget.parentElement;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const sl = deck.slides[slideKey];
    const count = normalizeColCount(sl.colCount);
    const widths = normalizeWidths(count, sl.widths ?? (count === 2 ? [sl.r, 1 - sl.r] : undefined));
    const move = (ev: MouseEvent) => {
      const x = (ev.clientX - rect.left) / rect.width;
      const next = [...widths];
      if (count === 2) {
        const f = Math.max(0.2, Math.min(0.8, x));
        next[0] = Math.round(f * 1000) / 1000;
        next[1] = Math.round((1 - f) * 1000) / 1000;
      } else {
        const leftSum = widths.slice(0, handleIndex).reduce((a, b) => a + b, 0);
        const pair = widths[handleIndex] + widths[handleIndex + 1];
        let left = x - leftSum;
        left = Math.max(0.12, Math.min(pair - 0.12, left));
        next[handleIndex] = Math.round(left * 1000) / 1000;
        next[handleIndex + 1] = Math.round((pair - left) * 1000) / 1000;
      }
      patchSlide(slideKey, {
        widths: next,
        r: next[0] ?? 0.5,
      });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  function swapColumns(slideKey: string) {
    if (!editing) return;
    const sl = deck.slides[slideKey];
    const count = normalizeColCount(sl.colCount);
    if (count !== 2) return;
    const widths = normalizeWidths(2, sl.widths ?? [sl.r, 1 - sl.r]);
    patchSlide(slideKey, {
      cols: { a: sl.cols.b, b: sl.cols.a, c: sl.cols.c, d: sl.cols.d },
      widths: [widths[1], widths[0]],
      r: widths[1],
    });
  }

  function normalizeSlideCols(cols: ReadoutSlide["cols"]): ReadoutSlideCols {
    return {
      a: [...(cols.a ?? [])],
      b: [...(cols.b ?? [])],
      c: [...(cols.c ?? [])],
      d: [...(cols.d ?? [])],
    };
  }

  function startVisualResize(slideKey: string, blockId: string, e: React.MouseEvent) {
    if (!editing) return;
    e.preventDefault();
    let card = e.currentTarget as HTMLElement | null;
    while (card && !card.getAttribute("data-card")) card = card.parentElement;
    if (!card) return;
    const top = card.getBoundingClientRect().top;
    const block = deck.slides[slideKey]?.blocks[blockId];
    const isDataPoint = block?.type === "datapoint";
    const minH = isDataPoint ? 88 : 150;
    const maxH = isDataPoint ? 720 : 1400;
    const move = (ev: MouseEvent) => {
      let h = Math.round(ev.clientY - top);
      h = Math.max(minH, Math.min(maxH, h));
      updateBlock(slideKey, blockId, { h });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  function startCardWidthResize(slideKey: string, blockId: string, e: React.MouseEvent) {
    if (!editing) return;
    e.preventDefault();
    e.stopPropagation();
    let card = e.currentTarget as HTMLElement | null;
    while (card && !card.getAttribute("data-card")) card = card.parentElement;
    if (!card) return;
    const row = card.parentElement;
    if (!row) return;
    const rowWidth = row.getBoundingClientRect().width;
    if (rowWidth <= 0) return;
    const left = card.getBoundingClientRect().left;
    const move = (ev: MouseEvent) => {
      let w = (ev.clientX - left) / rowWidth;
      w = Math.max(0.22, Math.min(1, Math.round(w * 100) / 100));
      updateBlock(slideKey, blockId, { w });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  async function captureEl(el: HTMLElement) {
    return toCanvas(el, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#F3F5F2",
    });
  }

  async function downloadSlide() {
    if (exporting || onCover) return;
    const n = slide;
    const key = deck.order[n - 1];
    if (!key) return;
    setEditing(false);
    setMenuOpen(false);
    setExporting(true);
    await wait(200);
    try {
      const el = document.querySelector(`[data-export="${key}"]`) as HTMLElement | null;
      if (!el) throw new Error("Slide not found");
      const canvas = await captureEl(el);
      const a = document.createElement("a");
      a.download = `${clientName} Insights - Slide ${n}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } catch (err) {
      console.warn("Slide export failed:", err);
    }
    setExporting(false);
  }

  async function downloadAll() {
    if (busyAll) return;
    setBusyAll(true);
    setEditing(false);
    setMenuOpen(false);
    setExporting(true);
    await wait(100);
    try {
      const keys = ["cover", ...deck.order];
      let pdf: jsPDF | null = null;
      for (let i = 0; i < keys.length; i++) {
        setSlide(i);
        await wait(450);
        const el = document.querySelector(`[data-export="${keys[i]}"]`) as HTMLElement | null;
        if (!el) continue;
        const canvas = await captureEl(el);
        const w = Math.round(canvas.width / 2);
        const h = Math.round(canvas.height / 2);
        if (!pdf) {
          pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [w, h], hotfixes: ["px_scaling"] });
        } else {
          pdf.addPage([w, h], "landscape");
        }
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, w, h);
      }
      pdf?.save(`${clientName} Insights Readout.pdf`);
    } catch (err) {
      console.warn("Readout export failed:", err);
    }
    setBusyAll(false);
    setExporting(false);
    setSlide(0);
  }

  function toggleEdit() {
    if (!designMode) return;
    const next = !editing;
    setEditing(next);
    setMenuOpen(false);
    setPendingDeleteKey(null);
    window.dispatchEvent(new CustomEvent("portal-readout-edit-mode", { detail: next }));
  }

  function toggleDesignMode() {
    const next = !designMode;
    setDesignMode(next);
    if (!next) {
      setEditing(false);
      setMenuOpen(false);
      setPendingDeleteKey(null);
      window.dispatchEvent(new CustomEvent("portal-readout-edit-mode", { detail: false }));
    }
  }

  const cover = deck.cover;

  return (
    <div
      className="readout-deck relative min-h-[calc(100vh-var(--app-top-banner-height))] overflow-hidden bg-[#ECEFED] text-[#152238]"
      style={{ height: "calc(100vh - var(--app-top-banner-height))" }}
    >
      {/* Tailwind's reset strips list markers; readout copy needs them back. */}
      <style>{`
        [contenteditable="true"]{outline:1px dashed rgba(201,154,60,0.55);outline-offset:3px;border-radius:2px;}
        .readout-deck ul{list-style:disc;padding-left:1.15em;margin:0.15em 0;}
        .readout-deck ol{list-style:decimal;padding-left:1.3em;margin:0.15em 0;}
        .readout-deck li{margin:0.12em 0;}
        .readout-deck b,.readout-deck strong{font-weight:700;}
        .readout-deck i,.readout-deck em{font-style:italic;}
        .readout-deck u{text-decoration:underline;}
      `}</style>

      {/* Content slides */}
      {deck.order.map((key, idx) => {
        const sl = deck.slides[key];
        const i = idx + 1;
        const visible = slide === i;
        const colCount = normalizeColCount(sl.colCount);
        const widths = normalizeWidths(
          colCount,
          sl.widths ?? (colCount === 2 ? [sl.r, 1 - sl.r] : undefined)
        );
        const gridTemplate = widths
          .flatMap((w, wi) => (wi === 0 ? [`${w}fr`] : ["26px", `${w}fr`]))
          .join(" ");
        return (
          <div
            key={key}
            data-export={key}
            className="absolute inset-0 flex flex-col overflow-hidden bg-[#F3F5F2] px-11 pb-[78px] pt-[31px]"
            style={{ visibility: visible ? "visible" : "hidden", zIndex: visible ? 5 : 1 }}
          >
            <header className="mb-5 shrink-0">
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: sl.dot }} />
                <ReadoutEditableText
                  editing={editable}
                  value={sl.label}
                  onChange={(label) => patchSlide(key, { label })}
                  as="span"
                  className="min-w-0 overflow-wrap-anywhere text-[14px] font-semibold uppercase tracking-[0.2em] text-[#6E7E96]"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <ReadoutEditableText
                    editing={editable}
                    value={sl.pill}
                    onChange={(pill) => patchSlide(key, { pill })}
                    as="span"
                    className="rounded-full px-2.5 py-[4px] text-[13px] font-bold"
                    style={{ background: sl.pillBg, color: sl.pillFg }}
                  />
                  {editable ? (
                    <div className="flex items-center gap-1.5">
                      {READOUT_PILL_PRESETS.map((preset) => {
                        const active =
                          sl.pillBg.toLowerCase() === preset.bg.toLowerCase() &&
                          sl.pillFg.toLowerCase() === preset.fg.toLowerCase();
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            title={`${preset.label} tag`}
                            onClick={() =>
                              patchSlide(key, {
                                pillBg: preset.bg,
                                pillFg: preset.fg,
                                dot: preset.dot,
                              })
                            }
                            className="h-[16px] w-[16px] shrink-0 rounded-full"
                            style={{
                              background: preset.bg,
                              boxShadow: active
                                ? `0 0 0 2px ${preset.fg}`
                                : "inset 0 0 0 1px rgba(0,0,0,0.16)",
                            }}
                          />
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-end gap-4 pb-4">
                <ReadoutEditableText
                  editing={editable}
                  value={sl.headline}
                  onChange={(headline) => patchSlide(key, { headline })}
                  as="h2"
                  className="min-w-0 flex-1 overflow-wrap-anywhere whitespace-pre-wrap font-[family-name:var(--font-serif)] text-[38px] font-semibold leading-[1.12] tracking-[-0.01em] text-[#152238]"
                  style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                />
                <div
                  className="relative mb-0.5 flex shrink-0 flex-wrap items-center justify-end gap-1.5"
                  style={{ visibility: chromeVisible ? "visible" : "hidden" }}
                >
                  <button
                    type="button"
                    onClick={() => void downloadSlide()}
                    title="Download this slide as a PNG image"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#C9D2D8] bg-transparent px-3 py-1.5 text-[13px] font-medium text-[#4E5E52] hover:border-[#386B45] hover:bg-[#386B45] hover:text-white"
                  >
                    Download slide <span aria-hidden>⤓</span>
                  </button>
                  <a
                    href={buildDashboardDeepLink(readout.clientId, sl.dashboardLink, {
                      returnTo: pathname,
                      slide,
                    })}
                    title="Open the linked dashboard view"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#2F5A38] bg-[#386B45] px-3 py-1.5 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(56,107,69,0.22)] hover:border-[#2A5535] hover:bg-[#2F5A38]"
                  >
                    See in dashboard <span aria-hidden>↗</span>
                  </a>
                  {editable ? (
                    <DashboardLinkEditor
                      link={sl.dashboardLink}
                      options={dashboardLinkOptions}
                      onChange={(dashboardLink) => patchSlide(key, { dashboardLink })}
                    />
                  ) : null}
                </div>
              </div>

              <div
                className="h-[3px] w-full shrink-0"
                style={{ background: "linear-gradient(90deg,#C99A3C 0 52px,#6E7E96 52px)" }}
              />
            </header>

            <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: gridTemplate }}>
              {Array.from({ length: colCount }, (_, colIdx) => colIdx).flatMap((colIdx) => {
                const colKey = activeColKeys(colCount)[colIdx];
                const column = (
                  <div
                    key={`col-${colKey}`}
                    // overflow-hidden, never auto: a slide must not scroll.
                    className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden pb-0.5"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      dropOn(key, null, colIdx);
                    }}
                  >
                    {(() => {
                      const ids = sl.cols[colKey];
                      const rows: Array<
                        | { kind: "full"; id: string }
                        | { kind: "datapoints"; ids: string[] }
                      > = [];
                      let dpGroup: string[] = [];
                      const flushDp = () => {
                        if (dpGroup.length === 0) return;
                        rows.push({ kind: "datapoints", ids: dpGroup });
                        dpGroup = [];
                      };
                      for (const blockId of ids) {
                        const block = sl.blocks[blockId];
                        if (block?.type === "datapoint") {
                          dpGroup.push(blockId);
                        } else {
                          flushDp();
                          rows.push({ kind: "full", id: blockId });
                        }
                      }
                      flushDp();

                      const renderCard = (blockId: string) => {
                        const block = sl.blocks[blockId];
                        if (!block) return null;
                        return (
                          <DeckCard
                            key={blockId}
                            readoutId={readout.id}
                            slideKey={key}
                            blockId={blockId}
                            block={block}
                            editing={editable}
                            chromeVisible={designChrome}
                            onDragStart={(e) => {
                              dragRef.current = { slideKey: key, blockId };
                              e.dataTransfer.effectAllowed = "move";
                              try {
                                e.dataTransfer.setData("text/plain", blockId);
                                const card = (e.currentTarget as HTMLElement).closest(
                                  "[data-card]"
                                );
                                if (card) e.dataTransfer.setDragImage(card as Element, 30, 14);
                              } catch {
                                /* ok */
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              dropOn(key, blockId, null);
                            }}
                            onUpdate={(patch) => updateBlock(key, blockId, patch)}
                            onRemove={() => removeBlock(key, blockId)}
                            onVResize={(e) => startVisualResize(key, blockId, e)}
                            onVReset={() => {
                              if (editable) updateBlock(key, blockId, { h: null });
                            }}
                            onWResize={(e) => startCardWidthResize(key, blockId, e)}
                            onWReset={() => {
                              if (editable) updateBlock(key, blockId, { w: null });
                            }}
                          />
                        );
                      };

                      return rows.map((row, rowIdx) => {
                        if (row.kind === "datapoints") {
                          return (
                            <div
                              key={`dp-row-${colKey}-${rowIdx}`}
                              className="flex w-full flex-wrap content-start items-start gap-3"
                            >
                              {row.ids.map((blockId) => renderCard(blockId))}
                            </div>
                          );
                        }
                        return renderCard(row.id);
                      });
                    })()}
                  </div>
                );
                if (colIdx < colCount - 1) {
                  return [
                    column,
                    <div
                      key={`handle-${colIdx}`}
                      title={
                        colCount === 2
                          ? "Drag to resize columns · double-click to swap them"
                          : "Drag to resize columns"
                      }
                      className="flex cursor-col-resize items-center justify-center hover:bg-[rgba(201,154,60,0.08)]"
                      style={{ visibility: handleVisible ? "visible" : "hidden" }}
                      onMouseDown={(e) => startColResize(key, colIdx, e)}
                      onDoubleClick={() => swapColumns(key)}
                    >
                      <div className="h-11 w-1 rounded-sm bg-[#C9AF6E]" />
                    </div>,
                  ] as ReactNode[];
                }
                return [column] as ReactNode[];
              })}
            </div>
          </div>
        );
      })}

      {/* Cover */}
      <div
        data-export="cover"
        className="absolute inset-0 flex"
        style={{ visibility: onCover ? "visible" : "hidden", zIndex: onCover ? 5 : 1 }}
      >
        <section
          className="flex w-[min(605px,53.5%)] min-w-[360px] shrink-0 flex-col overflow-y-auto px-11 pb-8 pt-12"
          style={{
            background: "linear-gradient(160deg,#242424 0%,#22301F 100%)",
          }}
        >
          <div className="mt-auto flex min-h-0 flex-col">
            <div className="mb-6 flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E8CC70]" />
              <ReadoutEditableText
                editing={editable}
                value={`Insight readout · ${deck.waveLabel}`}
                onChange={(text) => {
                  const parts = text.split("·");
                  const wave = (parts[1] ?? parts[0] ?? "").trim();
                  commitDeck((d) => ({ ...d, waveLabel: wave || d.waveLabel }));
                }}
                as="span"
                className="min-w-0 overflow-wrap-anywhere text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgba(232,204,112,0.8)]"
              />
            </div>
            <ReadoutEditableText
              editing={editable}
              value={cover.headline}
              onChange={(headline) => patchCover({ headline })}
              as="h1"
              className="mb-5 min-w-0 overflow-wrap-anywhere whitespace-pre-wrap text-[42px] font-semibold leading-[1.12] tracking-[-0.01em] text-white"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
            />
            <ReadoutEditableText
              editing={editable}
              value={cover.body}
              onChange={(body) => patchCover({ body })}
              className="mb-8 max-w-[34rem] min-w-0 overflow-wrap-anywhere whitespace-pre-wrap text-[16px] leading-[1.65] text-white/65"
            />
            <div
              className="mb-10 flex flex-wrap items-center gap-3"
              style={{ visibility: chromeVisible ? "visible" : "hidden" }}
            >
              <button
                type="button"
                onClick={() => setSlide(1)}
                className="inline-flex items-center gap-2.5 rounded-full border-none bg-[linear-gradient(135deg,#E8CC70,#C99A3C)] px-[26px] py-3.5 text-sm font-bold text-[#242424] shadow-[0_8px_24px_rgba(201,154,60,0.3)] hover:shadow-[0_10px_30px_rgba(201,154,60,0.45)]"
              >
                Begin the readout <span className="text-[15px]">→</span>
              </button>
              <button
                type="button"
                onClick={() => void downloadAll()}
                title="Download the full readout — every slide as a landscape page in one file"
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(232,204,112,0.55)] bg-transparent px-[22px] py-[13px] text-[13.5px] font-semibold text-[#E8CC70] hover:bg-[rgba(232,204,112,0.12)]"
              >
                {busyAll ? "Preparing file…" : "Download all"} <span className="text-[15px]">⤓</span>
              </button>
            </div>

            <div className="flex flex-col gap-4 border-t border-white/10 pt-7">
              <div className="flex items-center gap-3.5">
                <span className="inline-flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-[0_6px_18px_rgba(0,0,0,0.3)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cover.logoUrl?.trim() || clientLogoUrl}
                    alt={clientName}
                    className="max-h-full max-w-full object-contain"
                  />
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
                    Prepared for
                  </p>
                  <ReadoutEditableText
                    editing={editable}
                    value={cover.preparedForName}
                    onChange={(preparedForName) => patchCover({ preparedForName })}
                    className="mt-0.5 min-w-0 overflow-wrap-anywhere text-[15px] font-bold text-white"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3.5">
                <span className="inline-flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-[0_6px_18px_rgba(0,0,0,0.3)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/CaliberConsulting2.0-transparent.png"
                    alt="Caliber Consulting seal"
                    className="max-h-full max-w-full object-contain"
                  />
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
                    Prepared by
                  </p>
                  <ReadoutEditableText
                    editing={editable}
                    value={cover.preparedByName}
                    onChange={(preparedByName) => patchCover({ preparedByName })}
                    className="mt-0.5 min-w-0 overflow-wrap-anywhere text-[15px] font-bold text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-[#F3F5F2] px-12 py-12">
          <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col justify-center">
            <p className="mb-1.5 text-[13px] font-bold uppercase tracking-[0.2em] text-[#6E7E96]">
              What&apos;s in this readout
            </p>
            <ReadoutEditableText
              editing={editable}
              value={cover.agendaSubhead}
              onChange={(agendaSubhead) => patchCover({ agendaSubhead })}
              className="mb-8 min-w-0 overflow-wrap-anywhere whitespace-pre-wrap text-[24px] leading-[1.35] text-[#152238]"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
            />
            <div className="flex flex-col gap-3.5">
              {deck.order.map((key, idx) => {
                const sl = deck.slides[key];
                const accent = sl.focusAccent || READOUT_FOCUS_ACCENT_DEFAULT;
                return (
                  <div
                    key={key}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (!editable) setSlide(idx + 1);
                    }}
                    onKeyDown={(e) => {
                      if (!editable && (e.key === "Enter" || e.key === " ")) setSlide(idx + 1);
                    }}
                    className="flex cursor-pointer items-start gap-4 rounded-2xl border bg-white px-5 py-4 hover:shadow-[0_6px_16px_rgba(21,34,56,0.08)]"
                    style={{ borderColor: accent }}
                  >
                    <span
                      className="min-w-[40px] shrink-0 text-[24px] font-semibold leading-[1.2]"
                      style={{
                        fontFamily: '"Playfair Display", Georgia, serif',
                        color: accent,
                      }}
                    >
                      {romanNumeral(idx + 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <ReadoutEditableText
                        editing={editable}
                        value={sl.label}
                        onChange={(label) => patchSlide(key, { label })}
                        className="mb-1 min-w-0 overflow-wrap-anywhere whitespace-pre-wrap text-[15px] font-bold text-[#152238]"
                      />
                      <ReadoutEditableText
                        editing={editable}
                        value={sl.blurb}
                        onChange={(blurb) => patchSlide(key, { blurb })}
                        className="min-w-0 overflow-wrap-anywhere whitespace-pre-wrap text-[14px] leading-[1.5] text-[#6E7E96]"
                      />
                      {editable ? (
                        <div className="mt-2.5 flex items-center gap-1.5">
                          {READOUT_FOCUS_ACCENTS.map((preset) => {
                            const active = accent.toLowerCase() === preset.color.toLowerCase();
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                title={`${preset.label} accent`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  patchSlide(key, { focusAccent: preset.color });
                                }}
                                className="h-[16px] w-[16px] shrink-0 rounded-full"
                                style={{
                                  background: preset.color,
                                  boxShadow: active
                                    ? `0 0 0 2px #152238`
                                    : "inset 0 0 0 1px rgba(0,0,0,0.16)",
                                }}
                              />
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2 self-center">
                      {editable ? (
                        pendingDeleteKey === key ? (
                          <div
                            className="flex items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              title="Confirm delete slide"
                              onClick={() => removeSlide(key)}
                              className="rounded-full border border-[#D8B0A8] bg-[#A2483A] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#8A3A2F]"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              title="Cancel delete"
                              onClick={() => setPendingDeleteKey(null)}
                              className="rounded-full border border-[#C9D2D8] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6E7E96] hover:bg-[#F5F8FA]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            title="Delete this slide"
                            disabled={deck.order.length <= 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDeleteKey(key);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E2C4BE] bg-[#FBF1EF] text-[14px] text-[#A2483A] hover:bg-[#A2483A] hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-[#FBF1EF] disabled:hover:text-[#A2483A]"
                          >
                            <span aria-hidden>🗑</span>
                          </button>
                        )
                      ) : null}
                      <span
                        aria-hidden
                        className="text-[28px] font-bold leading-none"
                        style={{ color: accent }}
                      >
                        ›
                      </span>
                    </div>
                  </div>
                );
              })}
              {(() => {
                const closingAccent = cover.closingAccent || READOUT_FOCUS_ACCENT_DEFAULT;
                return (
                  <div
                    className="flex items-start gap-4 rounded-2xl border bg-white px-5 py-4 hover:shadow-[0_6px_16px_rgba(21,34,56,0.08)]"
                    style={{ borderColor: closingAccent }}
                  >
                    <span
                      className="min-w-[40px] shrink-0 text-[24px] font-semibold leading-[1.2]"
                      style={{
                        fontFamily: '"Playfair Display", Georgia, serif',
                        color: closingAccent,
                      }}
                    >
                      {romanNumeral(deck.order.length + 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <ReadoutEditableText
                        editing={editable}
                        value={cover.closingTitle}
                        onChange={(closingTitle) => patchCover({ closingTitle })}
                        className="mb-1 min-w-0 overflow-wrap-anywhere whitespace-pre-wrap text-[15px] font-bold text-[#152238]"
                      />
                      <ReadoutEditableText
                        editing={editable}
                        value={cover.closingBody}
                        onChange={(closingBody) => patchCover({ closingBody })}
                        className="min-w-0 overflow-wrap-anywhere whitespace-pre-wrap text-[14px] leading-[1.5] text-[#6E7E96]"
                      />
                      {editable ? (
                        <div className="mt-2.5 flex items-center gap-1.5">
                          {READOUT_FOCUS_ACCENTS.map((preset) => {
                            const active =
                              closingAccent.toLowerCase() === preset.color.toLowerCase();
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                title={`${preset.label} accent`}
                                onClick={() => patchCover({ closingAccent: preset.color })}
                                className="h-[16px] w-[16px] shrink-0 rounded-full"
                                style={{
                                  background: preset.color,
                                  boxShadow: active
                                    ? `0 0 0 2px #152238`
                                    : "inset 0 0 0 1px rgba(0,0,0,0.16)",
                                }}
                              />
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                    <span
                      aria-hidden
                      className="self-center shrink-0 text-[28px] font-bold leading-none"
                      style={{ color: closingAccent }}
                    >
                      ›
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>
      </div>

      {/* Bottom-right admin chrome */}
      {isInternalUser ? (
        <div className="absolute bottom-4 right-6 z-[35] flex flex-col items-end gap-2">
          {designChrome && menuOpen && !onCover ? (
            <div className="flex flex-col gap-1 rounded-[12px] border border-white/10 bg-[rgba(20,28,24,0.94)] p-1.5 shadow-[0_12px_34px_rgba(0,0,0,0.35)]">
              <button
                type="button"
                onClick={() => addBlock("visual")}
                className="flex items-center gap-2 rounded-[8px] border-none bg-transparent px-2.5 py-1.5 text-left text-[11px] font-semibold text-white/85 hover:bg-[rgba(232,204,112,0.22)] hover:text-[#E8CC70]"
              >
                <span className="text-[13px]">▣</span> Add new visual
              </button>
              <button
                type="button"
                onClick={() => addBlock("text")}
                className="flex items-center gap-2 rounded-[8px] border-none bg-transparent px-2.5 py-1.5 text-left text-[11px] font-semibold text-white/85 hover:bg-[rgba(232,204,112,0.22)] hover:text-[#E8CC70]"
              >
                <span className="text-[13px]">¶</span> Add new text
              </button>
              <button
                type="button"
                onClick={() => addBlock("datapoint")}
                className="flex items-center gap-2 rounded-[8px] border-none bg-transparent px-2.5 py-1.5 text-left text-[11px] font-semibold text-white/85 hover:bg-[rgba(232,204,112,0.22)] hover:text-[#E8CC70]"
              >
                <span className="text-[13px]">#</span> Add data point
              </button>
            </div>
          ) : null}
          <div
            className="flex items-center gap-2"
            style={{ visibility: chromeVisible ? "visible" : "hidden" }}
          >
            {designChrome && !onCover ? (
              <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-[rgba(20,28,24,0.94)] p-0.5 shadow-[0_12px_34px_rgba(0,0,0,0.35)]">
                {([2, 3, 4] as ReadoutColCount[]).map((n) => {
                  const activeKey = deck.order[slide - 1];
                  const activeCount = activeKey
                    ? normalizeColCount(deck.slides[activeKey]?.colCount)
                    : 2;
                  const active = activeCount === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      title={`${n} columns`}
                      onClick={() => setSlideColCount(n)}
                      className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold ${
                        active
                          ? "bg-[linear-gradient(135deg,#E8CC70,#C99A3C)] text-[#242424]"
                          : "text-white/75 hover:text-[#E8CC70]"
                      }`}
                    >
                      {n} col
                    </button>
                  );
                })}
              </div>
            ) : null}
            {designChrome ? (
              <button
                type="button"
                onClick={toggleEdit}
                className="rounded-full border border-white/10 bg-[rgba(20,28,24,0.94)] px-3.5 py-[9px] text-[11px] font-semibold text-white/85 shadow-[0_12px_34px_rgba(0,0,0,0.35)] hover:text-[#E8CC70]"
              >
                {editing ? "Done" : "Edit"}
              </button>
            ) : null}
            {designChrome ? (
              <button
                type="button"
                onClick={() => (onCover ? addSlide() : setMenuOpen((v) => !v))}
                title={onCover ? "Add a new slide to the readout" : "Add an object to this slide"}
                className="h-[34px] w-[34px] rounded-full border-none bg-[linear-gradient(135deg,#E8CC70,#C99A3C)] text-[16px] font-bold leading-none text-[#242424] shadow-[0_8px_24px_rgba(201,154,60,0.4)] hover:shadow-[0_10px_30px_rgba(201,154,60,0.55)]"
              >
                {!onCover && menuOpen ? "×" : "+"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={toggleDesignMode}
              title={
                designMode
                  ? "Switch to presentation mode (client view)"
                  : "Switch to design mode"
              }
              className={`rounded-full px-3.5 py-[9px] text-[11px] font-semibold shadow-[0_12px_34px_rgba(0,0,0,0.35)] ${
                designMode
                  ? "border border-white/10 bg-[rgba(20,28,24,0.94)] text-white/85 hover:text-[#E8CC70]"
                  : "border-none bg-[linear-gradient(135deg,#E8CC70,#C99A3C)] text-[#242424] hover:shadow-[0_4px_14px_rgba(201,154,60,0.5)]"
              }`}
            >
              {designMode ? "Present" : "Design"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Footer nav */}
      <div
        className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-[rgba(20,28,24,0.94)] px-2 py-1.5 shadow-[0_12px_34px_rgba(0,0,0,0.35)]"
        style={{ visibility: onCover || !chromeVisible ? "hidden" : "visible" }}
      >
        <button
          type="button"
          onClick={() => {
            setSlide((s) => Math.max(0, s - 1));
            setMenuOpen(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border-none bg-white/8 px-4 py-2 text-[11px] font-semibold text-white/85 hover:bg-[rgba(232,204,112,0.22)] hover:text-[#E8CC70]"
        >
          ← Prev
        </button>
        <button
          type="button"
          onClick={() => {
            setSlide(0);
            setMenuOpen(false);
          }}
          className="inline-flex items-center rounded-full border-none bg-white/8 px-4 py-2 text-[11px] font-semibold text-white/85 hover:bg-[rgba(232,204,112,0.22)] hover:text-[#E8CC70]"
        >
          Cover
        </button>
        <button
          type="button"
          onClick={() => {
            setSlide((s) => (s >= deck.order.length ? 0 : s + 1));
            setMenuOpen(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border-none bg-[linear-gradient(135deg,#E8CC70,#C99A3C)] px-4 py-2 text-[11px] font-bold text-[#242424] hover:shadow-[0_4px_14px_rgba(201,154,60,0.5)]"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

function DashboardLinkEditor({
  link,
  options,
  onChange,
}: {
  link?: ReadoutDashboardLink | null;
  options?: ReadoutDashboardLinkOptions | null;
  onChange: (next: ReadoutDashboardLink) => void;
}) {
  const [open, setOpen] = useState(false);
  const dashboards = options?.dashboards ?? [];
  const selected =
    dashboards.find((d) => d.assetId === link?.assetId) ||
    dashboards.find((d) => d.href === link?.href) ||
    null;
  const family =
    selected?.family ||
    link?.family ||
    (link?.product === "collaboration" ? "collaboration" : "employee_experience");
  const perspectives =
    family === "collaboration"
      ? options?.collabPerspectives ?? []
      : family === "employee_experience"
        ? options?.eePerspectives ?? []
        : [];
  const filterFields = dashboardLinkFilterFields(family, link?.perspectiveId);
  const campaigns = options?.campaigns ?? [];
  const linkedLabel = selected?.title?.trim() || link?.perspectiveId || null;

  function patch(partial: Partial<ReadoutDashboardLink>) {
    onChange({ ...(link ?? {}), ...partial });
  }

  const fieldClassName =
    "w-full rounded-lg border border-[#C9D2D8] bg-white px-2.5 py-2 text-[12px] font-semibold normal-case tracking-normal text-[#152238]";
  const labelClassName =
    "flex w-full flex-col gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6E7E96]";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        title={open ? "Hide dashboard link settings" : "Edit dashboard link settings"}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[13px] font-semibold ${
          open
            ? "border-[#2F5A38] bg-[#386B45] text-white"
            : "border-[#C9D2D8] bg-white text-[#4E5E52] hover:border-[#386B45] hover:bg-[#386B45] hover:text-white"
        }`}
      >
        Link
        <span aria-hidden className="text-[11px]">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[280px] rounded-2xl border border-[#D4DAD6] bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
          <div className="mb-2.5 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">
                Dashboard link
              </p>
              <p className="mt-0.5 truncate text-[12px] font-semibold text-[#152238]">
                {linkedLabel ?? "Not linked yet"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-[#E2E8EF] px-2 py-1 text-[11px] font-semibold text-[#6E7E96] hover:bg-[#F5F8FA]"
            >
              Close
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            <label className={labelClassName}>
              Dashboard
              <select
                value={selected?.assetId || link?.assetId || ""}
                onChange={(e) => {
                  const next = dashboards.find((d) => d.assetId === e.target.value);
                  if (!next) {
                    patch({
                      assetId: null,
                      href: null,
                      family: null,
                      perspectiveId: null,
                      campaign: null,
                      prior: null,
                      location: null,
                      department: null,
                      index: null,
                      brand: null,
                      supervisor: null,
                    });
                    return;
                  }
                  patch({
                    assetId: next.assetId,
                    href: next.href,
                    family: next.family,
                    product: null,
                    perspectiveId: null,
                    campaign: null,
                    prior: null,
                    location: null,
                    department: null,
                    index: null,
                    brand: null,
                    supervisor: null,
                  });
                }}
                className={fieldClassName}
              >
                <option value="">Select published dashboard…</option>
                {dashboards.map((d) => (
                  <option key={d.assetId} value={d.assetId}>
                    {d.title}
                  </option>
                ))}
              </select>
            </label>

            {selected || link?.assetId ? (
              <label className={labelClassName}>
                Perspective
                <select
                  value={link?.perspectiveId || ""}
                  onChange={(e) =>
                    patch({
                      perspectiveId: e.target.value || null,
                      location: null,
                      department: null,
                      index: null,
                      brand: null,
                      supervisor: null,
                    })
                  }
                  className={fieldClassName}
                  disabled={perspectives.length === 0}
                >
                  <option value="">
                    {perspectives.length === 0
                      ? "No perspectives for this dashboard"
                      : "Default"}
                  </option>
                  {perspectives.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {filterFields.map((field) => {
              if (field.key === "campaign" || field.key === "prior") {
                return (
                  <label key={field.key} className={labelClassName}>
                    {field.label}
                    <select
                      value={link?.[field.key] || ""}
                      onChange={(e) => patch({ [field.key]: e.target.value || null })}
                      className={fieldClassName}
                    >
                      <option value="">Optional</option>
                      {campaigns.map((campaign) => (
                        <option key={`${field.key}-${campaign}`} value={campaign}>
                          {campaign}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }

              return (
                <label key={field.key} className={labelClassName}>
                  {field.label}
                  <input
                    type="text"
                    value={link?.[field.key] || ""}
                    onChange={(e) => patch({ [field.key]: e.target.value || null })}
                    placeholder="Optional"
                    className={`${fieldClassName} font-medium placeholder:text-[#9AA7B4]`}
                  />
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DeckCard({
  readoutId,
  block,
  editing,
  chromeVisible,
  onDragStart,
  onDrop,
  onUpdate,
  onRemove,
  onVResize,
  onVReset,
  onWResize,
  onWReset,
}: {
  readoutId: string;
  slideKey: string;
  blockId: string;
  block: ReadoutBlock;
  editing: boolean;
  chromeVisible: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onUpdate: (patch: Partial<ReadoutBlock>) => void;
  onRemove: () => void;
  onVResize: (e: React.MouseEvent) => void;
  onVReset: () => void;
  onWResize: (e: React.MouseEvent) => void;
  onWReset: () => void;
}) {
  const isVisual = block.type === "visual";
  const isDataPoint = block.type === "datapoint";
  const textBlock = block.type === "text" ? block : null;
  const dataBlock = isDataPoint ? (block as ReadoutDataPointBlock) : null;
  const visualBlock = isVisual ? (block as ReadoutVisualBlock) : null;
  const colorIdx = textBlock?.color ?? dataBlock?.color ?? 0;
  const preset = READOUT_COLOR_PRESETS[colorIdx] ?? READOUT_COLOR_PRESETS[0];
  const sizeIdx = textBlock?.size ?? 0;
  const size = READOUT_TEXT_SIZES[sizeIdx] ?? READOUT_TEXT_SIZES[0];
  const dpSizeIdx = dataBlock?.size ?? 2;
  const dpSize = READOUT_DATAPOINT_SIZES[dpSizeIdx] ?? READOUT_DATAPOINT_SIZES[2];
  const fixedH = visualBlock?.h ?? dataBlock?.h;
  const widthFrac = Math.max(0.22, Math.min(1, (isVisual ? visualBlock?.w : dataBlock?.w) ?? 1));
  const widthPct = Math.round(widthFrac * 1000) / 10;
  const widthStyle =
    widthFrac >= 0.999
      ? "100%"
      : isVisual
        ? `${widthPct}%`
        : `calc(${widthPct}% - 6px)`;
  const dragEnabled = isVisual && editing;
  const bodyRef = useRef<HTMLElement | null>(null);

  return (
    <div
      data-card="1"
      draggable={dragEnabled}
      onDragStart={dragEnabled ? onDragStart : undefined}
      className={`relative flex min-h-0 flex-col overflow-hidden${dragEnabled ? " cursor-grab active:cursor-grabbing" : ""}`}
      style={{
        // A height-free visual shares the column's leftover space instead of
        // claiming a 240px basis, which used to push content past the slide.
        flex: isVisual
          ? fixedH
            ? "0 0 auto"
            : "1 1 0"
          : isDataPoint
            ? `0 0 ${widthStyle}`
            : "0 0 auto",
        width: isDataPoint || isVisual ? widthStyle : undefined,
        maxWidth: isDataPoint || isVisual ? "100%" : undefined,
        minWidth: isDataPoint ? 120 : isVisual ? 150 : undefined,
        minHeight: isDataPoint && !fixedH ? 96 : 0,
        height: fixedH ? fixedH : "auto",
        borderRadius: isVisual ? 16 : isDataPoint ? 18 : 14,
        border: `1px solid ${isVisual ? "#8798AA" : preset.border}`,
        background: isVisual ? "#FFFFFF" : preset.bg,
        boxShadow: isVisual
          ? "7px 9px 20px rgba(15,23,42,0.07),2px 3px 6px rgba(15,23,42,0.04)"
          : "none",
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {isVisual && visualBlock ? (
        <>
          <div className="px-3 pt-2.5">
            <ReadoutEditableText
              editing={editing}
              value={visualBlock.sub}
              onChange={(sub) => onUpdate({ sub })}
              className="min-w-0 overflow-wrap-anywhere whitespace-pre-wrap text-[11px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]"
              style={{ minHeight: editing ? 12 : 0 }}
            />
          </div>
          <div className="relative min-h-[110px] flex-1 p-2">
            <ReadoutImageSlot
              readoutId={readoutId}
              slotId={visualBlock.slot}
              imageUrl={visualBlock.imageUrl}
              editing={editing}
              onUploaded={(url) => onUpdate({ imageUrl: url })}
              onRemove={onRemove}
            />
          </div>
          {editing ? (
            <div
              title="Drag to set this visual's height · double-click to auto-fill"
              className="flex h-[13px] shrink-0 cursor-row-resize items-center justify-center border-t border-[#EDF1EE] bg-[#F7F9F8] hover:bg-[rgba(201,154,60,0.12)]"
              onMouseDown={onVResize}
              onDoubleClick={onVReset}
            >
              <div className="h-1 w-11 rounded-sm bg-[#C9AF6E]" />
            </div>
          ) : null}
          {editing ? (
            <div
              title="Drag to set this visual's width · double-click for full column width"
              className="absolute bottom-5 right-0 top-3 z-10 flex w-[11px] cursor-col-resize items-center justify-center hover:bg-[rgba(201,154,60,0.14)]"
              onMouseDown={onWResize}
              onDoubleClick={onWReset}
            >
              <div className="h-11 w-1 rounded-sm bg-[#C9AF6E]" />
            </div>
          ) : null}
        </>
      ) : dataBlock ? (
        <>
          <div
            draggable
            onDragStart={onDragStart}
            title="Drag to move this card"
            className="flex cursor-grab items-center justify-center pt-[5px] hover:bg-[rgba(201,154,60,0.08)]"
          >
            <span
              className="text-xs leading-none tracking-[3px]"
              style={{
                color: dataBlock.color === 6 ? "#B9C2CE" : preset.label,
                visibility: chromeVisible ? "visible" : "hidden",
              }}
            >
              ⋮⋮⋮
            </span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center px-4 pb-4 pt-1 text-center">
            <ReadoutEditableText
              editing={editing}
              value={dataBlock.value}
              onChange={(value) => onUpdate({ value })}
              className="min-w-0 overflow-wrap-anywhere whitespace-pre-wrap font-semibold tracking-[-0.02em]"
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: dpSize.value,
                lineHeight: dpSize.lineHeight,
                color: preset.text,
              }}
            />
            <ReadoutEditableText
              editing={editing}
              value={dataBlock.subtitle}
              onChange={(subtitle) => onUpdate({ subtitle })}
              className="mt-2 min-w-0 overflow-wrap-anywhere whitespace-pre-wrap font-bold uppercase tracking-[0.14em]"
              style={{
                fontSize: dpSize.subtitle,
                color: preset.label,
              }}
            />
            {editing ? (
              <div className="mt-3 flex w-full items-center justify-center gap-[7px]">
                {[0, 1, 2, 3].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => onUpdate({ size: sz as 0 | 1 | 2 | 3 })}
                    title={sz === 3 ? "Extra-large number" : `Size ${sz + 1}`}
                    className="border-none bg-transparent px-0.5 font-extrabold leading-none"
                    style={{
                      fontSize: sz === 0 ? 11 : sz === 1 ? 14 : sz === 2 ? 17 : 20,
                      color: dpSizeIdx === sz ? "#C99A3C" : "#9AA7B4",
                    }}
                  >
                    A
                  </button>
                ))}
                <span className="mx-0.5 h-4 w-px bg-[#D8DEE2]" />
                {READOUT_COLOR_PRESETS.map((sp, i) => (
                  <span
                    key={i}
                    role="button"
                    tabIndex={0}
                    title="Set card color"
                    onClick={() => onUpdate({ color: i })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") onUpdate({ color: i });
                    }}
                    className="h-[17px] w-[17px] shrink-0 cursor-pointer rounded-full"
                    style={{
                      background:
                        i === 6
                          ? "linear-gradient(135deg,#FFFFFF 42%,#C9D2D8 42% 58%,#FFFFFF 58%)"
                          : sp.bg,
                      boxShadow:
                        i === (dataBlock.color || 0)
                          ? "0 0 0 2.5px #C99A3C"
                          : "inset 0 0 0 1px rgba(0,0,0,0.18)",
                    }}
                  />
                ))}
                <button
                  type="button"
                  onClick={onRemove}
                  title="Remove this card"
                  className="ml-1 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-[#D8B0A8] bg-[#FBF1EF] text-[11px] font-bold leading-none text-[#A2483A] hover:bg-[#A2483A] hover:text-white"
                >
                  ✕
                </button>
              </div>
            ) : null}
          </div>
          {editing ? (
            <div
              title="Drag to set this data point's height · double-click to auto-fit"
              className="flex h-[13px] shrink-0 cursor-row-resize items-center justify-center border-t border-[rgba(0,0,0,0.06)] hover:bg-[rgba(201,154,60,0.12)]"
              onMouseDown={onVResize}
              onDoubleClick={onVReset}
            >
              <div className="h-1 w-11 rounded-sm bg-[#C9AF6E]" />
            </div>
          ) : null}
          {editing ? (
            <div
              title="Drag to set this data point's width · double-click for full column width"
              className="absolute bottom-3 right-0 top-3 z-10 flex w-[11px] cursor-col-resize items-center justify-center hover:bg-[rgba(201,154,60,0.14)]"
              onMouseDown={onWResize}
              onDoubleClick={onWReset}
            >
              <div className="h-11 w-1 rounded-sm bg-[#C9AF6E]" />
            </div>
          ) : null}
        </>
      ) : textBlock ? (
        <>
          <div
            draggable
            onDragStart={onDragStart}
            title="Drag to move this card"
            className="flex cursor-grab items-center justify-center pt-[5px] hover:bg-[rgba(201,154,60,0.08)]"
          >
            <span
              className="text-xs leading-none tracking-[3px]"
              style={{
                color: textBlock.color === 6 ? "#B9C2CE" : preset.label,
                visibility: chromeVisible ? "visible" : "hidden",
              }}
            >
              ⋮⋮⋮
            </span>
          </div>
          <div className="px-[18px] pb-3.5 pt-1">
            <ReadoutEditableText
              editing={editing}
              value={textBlock.subtitle}
              onChange={(subtitle) => onUpdate({ subtitle })}
              className="mb-[7px] min-w-0 overflow-wrap-anywhere whitespace-pre-wrap font-bold uppercase tracking-[0.14em]"
              style={{
                fontSize: size.subtitle,
                minHeight: editing ? 12 : 0,
                color: preset.label,
              }}
            />
            <ReadoutEditableText
              editing={editing}
              value={textBlock.body}
              onChange={(body) => onUpdate({ body })}
              onElement={(el) => {
                bodyRef.current = el;
              }}
              className="min-w-0 overflow-wrap-anywhere whitespace-pre-wrap"
              style={{
                fontSize: size.body,
                lineHeight: size.lineHeight,
                color: preset.text,
              }}
            />
            {editing ? (
              <div className="mt-[11px] flex items-center gap-[7px]">
                <button
                  type="button"
                  title="Bullet list"
                  // Keep the caret in the body; a blur would drop the selection.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const el = bodyRef.current;
                    if (!el) return;
                    if (document.activeElement !== el) {
                      el.focus();
                      const range = document.createRange();
                      range.selectNodeContents(el);
                      range.collapse(false);
                      const selection = window.getSelection();
                      selection?.removeAllRanges();
                      selection?.addRange(range);
                    }
                    document.execCommand("insertUnorderedList");
                    onUpdate({ body: sanitizeReadoutHtml(el.innerHTML) });
                  }}
                  className="border-none bg-transparent px-0.5 text-[13px] leading-none text-[#9AA7B4] hover:text-[#C99A3C]"
                >
                  ☰
                </button>
                <span className="mx-0.5 h-4 w-px bg-[#D8DEE2]" />
                {[0, 1, 2].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => onUpdate({ size: sz as 0 | 1 | 2 })}
                    title={sz === 0 ? "Small text" : sz === 1 ? "Medium text" : "Large text (title size)"}
                    className="border-none bg-transparent px-0.5 font-extrabold leading-none"
                    style={{
                      fontSize: sz === 0 ? 11 : sz === 1 ? 14 : 17,
                      color: sizeIdx === sz ? "#C99A3C" : "#9AA7B4",
                    }}
                  >
                    A
                  </button>
                ))}
                <span className="mx-0.5 h-4 w-px bg-[#D8DEE2]" />
                {READOUT_COLOR_PRESETS.map((sp, i) => (
                  <span
                    key={i}
                    role="button"
                    tabIndex={0}
                    title="Set card color"
                    onClick={() => onUpdate({ color: i })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") onUpdate({ color: i });
                    }}
                    className="h-[17px] w-[17px] shrink-0 cursor-pointer rounded-full"
                    style={{
                      background:
                        i === 6
                          ? "linear-gradient(135deg,#FFFFFF 42%,#C9D2D8 42% 58%,#FFFFFF 58%)"
                          : sp.bg,
                      boxShadow:
                        i === (textBlock.color || 0)
                          ? "0 0 0 2.5px #C99A3C"
                          : "inset 0 0 0 1px rgba(0,0,0,0.18)",
                    }}
                  />
                ))}
                <button
                  type="button"
                  onClick={onRemove}
                  title="Remove this card"
                  className="ml-auto flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-[#D8B0A8] bg-[#FBF1EF] text-[11px] font-bold leading-none text-[#A2483A] hover:bg-[#A2483A] hover:text-white"
                >
                  ✕
                </button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
