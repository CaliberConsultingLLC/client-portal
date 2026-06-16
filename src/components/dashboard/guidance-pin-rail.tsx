"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type { DashboardGuidancePin, GuidancePinAccent } from "@/types/guidance-pins";

const ACCENT_COLORS: Record<GuidancePinAccent, string> = {
  blue: "#5E7898",
  red: "#C96B60",
  green: "#2F9151",
};

function newPinId() {
  return `pin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function GuidancePinCard({
  pin,
  editing,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  disableMoveUp,
  disableMoveDown,
}: {
  pin: DashboardGuidancePin;
  editing: boolean;
  onChange: (next: DashboardGuidancePin) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableMoveUp: boolean;
  disableMoveDown: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (editing) {
    return (
      <div className="rounded-2xl bg-white p-3" style={{ border: "1px solid #8798AA" }}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6E7E96]">Pin</span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onMoveUp} disabled={disableMoveUp} className="rounded-lg p-1 text-[#6E7E96] hover:bg-[#F1F4F7] disabled:opacity-30" aria-label="Move up">
              <ChevronUp className="h-4 w-4" />
            </button>
            <button type="button" onClick={onMoveDown} disabled={disableMoveDown} className="rounded-lg p-1 text-[#6E7E96] hover:bg-[#F1F4F7] disabled:opacity-30" aria-label="Move down">
              <ChevronDown className="h-4 w-4" />
            </button>
            <button type="button" onClick={onDelete} className="rounded-lg p-1 text-[#C96B60] hover:bg-[#FFF1EF]" aria-label="Delete pin">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mb-3 flex gap-2">
          {(["blue", "red", "green"] as GuidancePinAccent[]).map((accent) => (
            <button
              key={accent}
              type="button"
              onClick={() => onChange({ ...pin, accent })}
              className="flex h-9 w-9 items-center justify-center rounded-full transition"
              style={{
                background: ACCENT_COLORS[accent],
                boxShadow: pin.accent === accent ? "0 0 0 2px #152238, 0 0 0 4px #fff" : "none",
                opacity: pin.accent === accent ? 1 : 0.55,
              }}
              aria-label={`${accent} accent`}
              aria-pressed={pin.accent === accent}
            />
          ))}
        </div>

        <input
          value={pin.title}
          onChange={(e) => onChange({ ...pin, title: e.target.value })}
          placeholder="Title"
          className="mb-2 w-full rounded-xl border border-[#D3DDE7] px-3 py-2 text-sm font-semibold text-[#152238] focus:border-[#8798AA] focus:outline-none"
        />
        <textarea
          value={pin.body}
          onChange={(e) => onChange({ ...pin, body: e.target.value })}
          placeholder="Expanded guidance text"
          rows={5}
          className="w-full resize-y rounded-xl border border-[#D3DDE7] px-3 py-2 text-sm leading-relaxed text-[#3B4B63] focus:border-[#8798AA] focus:outline-none"
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-3" style={{ border: "1px solid #8798AA" }}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-start gap-3 text-left">
        <span
          className="mt-0.5 h-4 w-4 shrink-0 rounded-full"
          style={{ background: ACCENT_COLORS[pin.accent] }}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold leading-snug text-[#152238]">{pin.title}</span>
          {open ? (
            <span className="mt-2 block whitespace-pre-wrap text-[13px] leading-relaxed text-[#3B4B63]">
              {pin.body || "No additional detail yet."}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className="mt-0.5 h-4 w-4 shrink-0 text-[#6E7E96] transition-transform"
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>
    </div>
  );
}

export function GuidancePinRail({
  dashboardInstanceId,
  perspectiveId,
  campaignLabel,
  filterKey,
  canEdit,
  className,
  style,
}: {
  dashboardInstanceId?: string;
  perspectiveId: string;
  campaignLabel: string;
  filterKey: string;
  canEdit?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [pins, setPins] = useState<DashboardGuidancePin[]>([]);
  const [draftPins, setDraftPins] = useState<DashboardGuidancePin[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scopeReady = Boolean(dashboardInstanceId && perspectiveId && campaignLabel);

  const loadPins = useCallback(async () => {
    if (!dashboardInstanceId) {
      setPins([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        perspectiveId,
        campaignLabel,
        filterKey: filterKey || "default",
      });
      const response = await fetch(
        `/api/portal/dashboard-instances/${dashboardInstanceId}/guidance?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Unable to load guidance pins.");
      }

      const payload = (await response.json()) as { scope?: { pins?: DashboardGuidancePin[] } };
      const nextPins = [...(payload.scope?.pins ?? [])].sort((a, b) => a.order - b.order);
      setPins(nextPins);
      setDraftPins(nextPins);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load guidance pins.");
      setPins([]);
      setDraftPins([]);
    } finally {
      setLoading(false);
    }
  }, [campaignLabel, dashboardInstanceId, filterKey, perspectiveId]);

  useEffect(() => {
    void loadPins();
  }, [loadPins]);

  useEffect(() => {
    if (!editing) {
      setDraftPins(pins);
    }
  }, [editing, pins]);

  const sortedDraftPins = useMemo(
    () => [...draftPins].sort((a, b) => a.order - b.order),
    [draftPins]
  );

  async function handleSave() {
    if (!dashboardInstanceId) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/portal/dashboard-instances/${dashboardInstanceId}/guidance`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            perspectiveId,
            campaignLabel,
            filterKey: filterKey || "default",
            pins: sortedDraftPins.map((pin, index) => ({ ...pin, order: index })),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Unable to save guidance pins.");
      }

      const payload = (await response.json()) as { scope?: { pins?: DashboardGuidancePin[] } };
      const nextPins = [...(payload.scope?.pins ?? [])].sort((a, b) => a.order - b.order);
      setPins(nextPins);
      setDraftPins(nextPins);
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save guidance pins.");
    } finally {
      setSaving(false);
    }
  }

  function updatePin(index: number, next: DashboardGuidancePin) {
    setDraftPins((current) => current.map((pin, pinIndex) => (pinIndex === index ? next : pin)));
  }

  function deletePin(index: number) {
    setDraftPins((current) => current.filter((_, pinIndex) => pinIndex !== index));
  }

  function movePin(index: number, direction: -1 | 1) {
    setDraftPins((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy.map((pin, order) => ({ ...pin, order }));
    });
  }

  function addPin() {
    setDraftPins((current) => [
      ...current,
      {
        id: newPinId(),
        title: "New insight",
        body: "",
        accent: "blue",
        order: current.length,
      },
    ]);
  }

  return (
    <aside className={className} style={{ ...style, position: style?.position ?? "relative" }}>
      {editing && canEdit && scopeReady ? (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-xl bg-[#152238] px-3 py-2 text-xs font-semibold text-white hover:bg-[#24324A] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="mb-3 rounded-xl border border-[#E7B0A5] bg-[#FFF5F3] px-3 py-2 text-xs text-[#642019]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl bg-white p-4 text-sm text-[#6E7E96]" style={{ border: "1px solid #8798AA" }}>
          Loading guidance…
        </div>
      ) : null}

      {!loading && !scopeReady ? (
        <div className="rounded-2xl bg-white p-4 text-sm text-[#6E7E96]" style={{ border: "1px solid #8798AA" }}>
          Guidance pins are available on assigned portal dashboard instances.
        </div>
      ) : null}

      {!loading && scopeReady ? (
        <div className="flex flex-col gap-3">
          {(editing ? sortedDraftPins : pins).map((pin, index) => (
            <GuidancePinCard
              key={pin.id}
              pin={pin}
              editing={editing}
              onChange={(next) => updatePin(index, next)}
              onDelete={() => deletePin(index)}
              onMoveUp={() => movePin(index, -1)}
              onMoveDown={() => movePin(index, 1)}
              disableMoveUp={index === 0}
              disableMoveDown={index === (editing ? sortedDraftPins : pins).length - 1}
            />
          ))}

          {editing ? (
            <button
              type="button"
              onClick={addPin}
              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#8798AA] bg-white px-3 py-3 text-sm font-semibold text-[#3B4B63] hover:bg-[#F1F4F7]"
            >
              <Plus className="h-4 w-4" />
              Add pin
            </button>
          ) : null}

          {!editing && pins.length === 0 ? (
            <div className="rounded-2xl bg-white p-4 text-sm text-[#6E7E96]" style={{ border: "1px solid #8798AA" }}>
              {canEdit ? "No pins yet. Use the + control to add guidance for this view." : "No guidance has been added for this view yet."}
            </div>
          ) : null}
        </div>
      ) : null}

      {canEdit && scopeReady ? (
        <button
          type="button"
          aria-label={editing ? "Cancel editing guidance pins" : "Edit guidance pins"}
          onClick={() => {
            if (editing) {
              setDraftPins(pins);
              setEditing(false);
            } else {
              setEditing(true);
            }
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#8798AA] bg-white text-[#152238] shadow-[0_4px_14px_rgba(15,23,42,0.12)] transition hover:bg-[#F1F4F7]"
          style={{ position: "absolute", right: 16, bottom: 16, zIndex: 5 }}
        >
          <Plus className="h-5 w-5" />
        </button>
      ) : null}
    </aside>
  );
}
