"use client";

import { useRef, useState } from "react";

interface ReadoutImageSlotProps {
  readoutId: string;
  slotId: string;
  imageUrl?: string | null;
  editing: boolean;
  onUploaded: (url: string) => void;
  onRemove?: () => void;
}

/** True when the drag carries files, not another readout card. */
function isFileDrag(transfer: DataTransfer | null) {
  if (!transfer) return false;
  return Array.from(transfer.types || []).includes("Files");
}

export function ReadoutImageSlot({
  readoutId,
  slotId,
  imageUrl,
  editing,
  onUploaded,
  onRemove,
}: ReadoutImageSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ingest(file: File) {
    if (!editing) return;
    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("slot", slotId);
      const response = await fetch(`/api/portal/readouts/${readoutId}/images`, {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Upload failed.");
      }
      onUploaded(payload.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`relative h-full min-h-[110px] w-full overflow-hidden rounded-lg ${imageUrl ? "bg-white" : "bg-black/[0.04]"}`}
      onDragEnter={(e) => {
        if (!editing || !isFileDrag(e.dataTransfer)) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragOver={(e) => {
        if (!editing || !isFileDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!editing) return;
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void ingest(file);
      }}
      style={
        over
          ? { outline: "2px solid #C99A3C", outlineOffset: -2, background: "rgba(201,154,60,0.10)" }
          : undefined
      }
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      ) : (
        <button
          type="button"
          disabled={!editing || busy}
          onClick={() => editing && inputRef.current?.click()}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center text-[13px] leading-tight text-black/55"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="opacity-45">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          <span className="font-medium tracking-wide">
            {busy ? "Uploading…" : "Screenshot a dashboard view and drop it here"}
          </span>
          {editing ? (
            <span className="text-[11px]">
              or <u>browse files</u>
            </span>
          ) : null}
        </button>
      )}
      {editing ? (
        <div className="absolute right-2 top-2 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100 [[data-card]:hover_&]:opacity-100">
          {imageUrl ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-md bg-black/65 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm hover:bg-black/80"
            >
              Replace
            </button>
          ) : null}
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              title="Remove this visual"
              className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-black/65 text-[11px] font-bold leading-none text-white backdrop-blur-sm hover:bg-[#A2483A]"
            >
              ✕
            </button>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <div className="absolute bottom-2 left-2 right-2 rounded bg-white/85 px-1.5 py-1 text-[11px] text-[#b3261e]">
          {error}
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void ingest(file);
          e.target.value = "";
        }}
      />
      {!imageUrl ? (
        <div
          className="pointer-events-none absolute inset-0 rounded-lg border-[1.5px] border-dashed"
          style={{ borderColor: over ? "#C99A3C" : "rgba(0,0,0,0.25)" }}
        />
      ) : null}
    </div>
  );
}
