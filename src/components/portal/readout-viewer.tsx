"use client";

import { useEffect, useMemo, useState } from "react";
import type { Readout, ReadoutFinding, ReadoutIntro, ReadoutOutro } from "@/types/readout";
import { ReadoutIntroScreen } from "./readout-intro";
import { ReadoutFindingsScreen } from "./readout-findings";
import { ReadoutOutroScreen } from "./readout-outro";

type ReadoutPage = "intro" | "findings" | "outro";

interface ReadoutViewerProps {
  readout: Readout;
  clientName: string;
  isInternalUser: boolean;
}

export function ReadoutViewer({ readout: initialReadout, clientName, isInternalUser }: ReadoutViewerProps) {
  const [readout, setReadout] = useState(initialReadout);
  const [page, setPage] = useState<ReadoutPage>("intro");
  const [findingIndex, setFindingIndex] = useState(0);
  const [editing, setEditing] = useState(false);

  const enabledFindings = useMemo(
    () =>
      readout.findings
        .filter((finding) => finding.enabled)
        .sort((left, right) => left.order - right.order),
    [readout.findings]
  );

  useEffect(() => {
    function handleEditModeEvent(event: Event) {
      if (!isInternalUser) {
        return;
      }
      const detail = (event as CustomEvent<boolean>).detail;
      setEditing(Boolean(detail));
    }

    window.addEventListener("portal-readout-edit-mode", handleEditModeEvent as EventListener);
    return () => {
      window.removeEventListener("portal-readout-edit-mode", handleEditModeEvent as EventListener);
    };
  }, [isInternalUser]);

  async function persistPatch(patch: Partial<Readout>) {
    if (!isInternalUser) {
      return;
    }
    const response = await fetch(`/api/portal/readouts/${readout.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { readout?: Readout };
    if (payload.readout) {
      setReadout(payload.readout);
    }
  }

  function updateIntroField<K extends keyof ReadoutIntro>(field: K, value: string) {
    const nextIntro = { ...readout.intro, [field]: value };
    setReadout((current) => ({ ...current, intro: nextIntro }));
    void persistPatch({ intro: nextIntro });
  }

  function updateOutroField<K extends keyof ReadoutOutro>(field: K, value: string) {
    const nextOutro = { ...readout.outro, [field]: value };
    setReadout((current) => ({ ...current, outro: nextOutro }));
    void persistPatch({ outro: nextOutro });
  }

  function updateFindingField(findingId: string, field: "headline" | "detail", value: string) {
    const nextFindings: ReadoutFinding[] = readout.findings.map((finding) =>
      finding.id === findingId ? { ...finding, [field]: value } : finding
    );
    setReadout((current) => ({ ...current, findings: nextFindings }));
    void persistPatch({ findings: nextFindings });
  }

  if (page === "intro") {
    return (
      <ReadoutIntroScreen
        readout={readout}
        clientName={clientName}
        editing={editing}
        onBegin={() => {
          setPage("findings");
          setFindingIndex(0);
        }}
        onFieldBlur={updateIntroField}
      />
    );
  }

  if (page === "findings") {
    return (
      <ReadoutFindingsScreen
        findings={enabledFindings}
        findingIndex={Math.min(findingIndex, Math.max(enabledFindings.length - 1, 0))}
        editing={editing}
        onSelectFinding={setFindingIndex}
        onGoIntro={() => setPage("intro")}
        onFinish={() => setPage("outro")}
        onFindingBlur={updateFindingField}
      />
    );
  }

  return (
    <ReadoutOutroScreen
      readout={readout}
      editing={editing}
      onFieldBlur={updateOutroField}
      onReviewFindings={() => {
        setPage("findings");
        setFindingIndex(0);
      }}
    />
  );
}
