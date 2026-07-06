"use client";

import { useMemo, useState } from "react";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReadoutFinding } from "@/types/readout";

interface ReadoutFindingsFormProps {
  readoutId: string;
  surveyWaveLabel?: string | null;
  findings: ReadoutFinding[];
  onChange: (findings: ReadoutFinding[]) => void;
  onSave: () => Promise<void>;
  onSynced?: (findings: ReadoutFinding[]) => void;
}

function findingTonePill(finding: ReadoutFinding) {
  if (finding.tone === "good") {
    return "bg-[#E7F2EB] text-[#2F9151]";
  }
  if (finding.tone === "risk") {
    return "bg-[#FBEBE9] text-[#C96B60]";
  }
  return "bg-[#E9F0F7] text-[#5E7898]";
}

function SortableFindingRow({
  finding,
  onToggleEnabled,
  onEdit,
}: {
  finding: ReadoutFinding;
  onToggleEnabled: (findingId: string, enabled: boolean) => void;
  onEdit: (finding: ReadoutFinding) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: finding.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex items-center gap-3 border-b border-[#EEF2EE] px-4 py-3 last:border-b-0 ${
        finding.enabled ? "bg-white" : "bg-[#F9FAFA] opacity-60"
      }`}
    >
      <button
        type="button"
        className="cursor-grab text-[#C7D0D8] active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <button
        type="button"
        className={`relative h-[18px] w-8 rounded-full ${finding.enabled ? "bg-[#386B45]" : "bg-[#C7D0D8]"}`}
        onClick={() => onToggleEnabled(finding.id, !finding.enabled)}
      >
        <span
          className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition-all ${
            finding.enabled ? "right-[2px]" : "left-[2px]"
          }`}
        />
      </button>

      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${findingTonePill(finding)}`}>
        {finding.verdict}
      </span>

      <span
        className={`flex-1 text-sm ${
          finding.enabled ? "font-medium text-[#152238]" : "text-[#6E7E96] line-through"
        }`}
      >
        {finding.headline}
      </span>

      {finding.enabled ? (
        <button type="button" className="text-xs font-semibold text-[#386B45]" onClick={() => onEdit(finding)}>
          Edit copy
        </button>
      ) : (
        <span className="text-xs text-[#9AA7B4]">Disabled - not shown to executive</span>
      )}
    </div>
  );
}

export function ReadoutFindingsForm({
  readoutId,
  surveyWaveLabel,
  findings,
  onChange,
  onSave,
  onSynced,
}: ReadoutFindingsFormProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [editingFinding, setEditingFinding] = useState<ReadoutFinding | null>(null);
  const [draftFinding, setDraftFinding] = useState<ReadoutFinding | null>(null);
  const [syncingChart, setSyncingChart] = useState(false);

  const sortedFindings = useMemo(
    () => [...findings].sort((left, right) => left.order - right.order),
    [findings]
  );

  const enabledCount = sortedFindings.filter((finding) => finding.enabled).length;

  function setFindings(nextFindings: ReadoutFinding[]) {
    onChange(nextFindings);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = sortedFindings.findIndex((finding) => finding.id === active.id);
    const newIndex = sortedFindings.findIndex((finding) => finding.id === over.id);
    const reordered = arrayMove(sortedFindings, oldIndex, newIndex).map((finding, index) => ({
      ...finding,
      order: index + 1,
    }));

    setFindings(reordered);
    void onSave();
  }

  function updateFinding(findingId: string, patch: Partial<ReadoutFinding>) {
    const updated = sortedFindings.map((finding) =>
      finding.id === findingId ? { ...finding, ...patch } : finding
    );
    setFindings(updated);
  }

  async function syncOverviewChart() {
    setSyncingChart(true);
    try {
      const response = await fetch(`/api/portal/readouts/${readoutId}/sync-chart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingId: "overview" }),
      });
      const payload = (await response.json()) as {
        readout?: { findings: ReadoutFinding[] };
        error?: string;
      };

      if (!response.ok || !payload.readout) {
        throw new Error(payload.error || "Unable to sync chart from dashboard.");
      }

      onChange(payload.readout.findings);
      onSynced?.(payload.readout.findings);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to sync chart from dashboard.");
    } finally {
      setSyncingChart(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] font-semibold text-[#152238]">
          {enabledCount} of {sortedFindings.length} findings enabled
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-[#D4DAD4]"
            disabled={syncingChart}
            onClick={syncOverviewChart}
          >
            {syncingChart ? "Syncing chart…" : "Sync overview chart from dashboard"}
          </Button>
          <p className="text-xs text-[#8A9A8C]">
            {surveyWaveLabel ? `Wave: ${surveyWaveLabel}` : "Uses latest CSV wave if unset"}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#D4DAD4] bg-white">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={sortedFindings.map((finding) => finding.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedFindings.map((finding) => (
              <SortableFindingRow
                key={finding.id}
                finding={finding}
                onToggleEnabled={(findingId, enabled) => {
                  updateFinding(findingId, { enabled });
                  void onSave();
                }}
                onEdit={(item) => {
                  setEditingFinding(item);
                  setDraftFinding(item);
                }}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <p className="text-xs italic text-[#8A9A8C]">
        Disabled findings are hidden from the executive view. Findings appear in the order shown here.
      </p>

      <Dialog open={Boolean(editingFinding)} onOpenChange={(open) => !open && setEditingFinding(null)}>
        <DialogContent className="max-w-2xl rounded-2xl border-[#D4DAD4]">
          <DialogHeader>
            <DialogTitle>Edit finding copy</DialogTitle>
            <DialogDescription>
              Update the narrative shown to executives for this finding.
            </DialogDescription>
          </DialogHeader>

          {draftFinding ? (
            <div className="space-y-3 py-2">
              <Input
                label="Short headline"
                value={draftFinding.headlineShort}
                onChange={(event) =>
                  setDraftFinding((current) =>
                    current ? { ...current, headlineShort: event.target.value } : current
                  )
                }
              />
              <Textarea
                label="Headline"
                value={draftFinding.headline}
                onChange={(event) =>
                  setDraftFinding((current) => (current ? { ...current, headline: event.target.value } : current))
                }
                className="min-h-[78px]"
              />
              <Textarea
                label="Detail"
                value={draftFinding.detail}
                onChange={(event) =>
                  setDraftFinding((current) => (current ? { ...current, detail: event.target.value } : current))
                }
                className="min-h-[90px]"
              />
              <Textarea
                label="The read"
                value={draftFinding.means ?? ""}
                onChange={(event) =>
                  setDraftFinding((current) => (current ? { ...current, means: event.target.value } : current))
                }
                className="min-h-[88px]"
              />
              <Textarea
                label="Do this next"
                value={draftFinding.act ?? ""}
                onChange={(event) =>
                  setDraftFinding((current) => (current ? { ...current, act: event.target.value } : current))
                }
                className="min-h-[88px]"
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-[#D4DAD4]"
              onClick={() => setEditingFinding(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full bg-[#386B45] text-white hover:bg-[#2E5738]"
              onClick={async () => {
                if (!editingFinding || !draftFinding) return;
                updateFinding(editingFinding.id, draftFinding);
                await onSave();
                setEditingFinding(null);
              }}
            >
              Save copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
