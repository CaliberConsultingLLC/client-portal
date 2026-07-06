"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Readout, ReadoutFinding, ReadoutIntro, ReadoutOutro } from "@/types/readout";
import { ReadoutIntroForm } from "./readout-intro-form";
import { ReadoutFindingsForm } from "./readout-findings-form";
import { ReadoutOutroForm } from "./readout-outro-form";
import { ReadoutPublishModal } from "./readout-publish-modal";

type EditorTab = "intro" | "findings" | "outro";

interface ReadoutEditorShellProps {
  initialReadout: Readout;
  clientName: string;
  basePath?: string;
}

function statusPill(status: Readout["status"]) {
  if (status === "published") {
    return "bg-[#E4EDE5] text-[#2F7048]";
  }

  if (status === "draft") {
    return "bg-[#FDF4E3] text-[#8A5E0A]";
  }

  return "bg-[#EDF2F5] text-[#60727D]";
}

export function ReadoutEditorShell({
  initialReadout,
  clientName,
  basePath = "/admin/readouts",
}: ReadoutEditorShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as EditorTab | null) ?? "intro";
  const [readout, setReadout] = useState(initialReadout);
  const [saving, setSaving] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  const breadcrumbs = useMemo(
    () => ["Portal", clientName, "Readouts", readout.name].join(" › "),
    [clientName, readout.name]
  );

  async function persistReadout(patch: Partial<Readout>) {
    setSaving(true);
    try {
      const response = await fetch(`/api/portal/readouts/${readout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = (await response.json()) as { readout?: Readout; error?: string };
      if (!response.ok || !payload.readout) {
        throw new Error(payload.error || "Unable to save readout.");
      }

      setReadout(payload.readout);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft() {
    await persistReadout({
      intro: readout.intro,
      findings: readout.findings,
      outro: readout.outro,
      status: "draft",
    });
  }

  function updateTab(tab: EditorTab) {
    router.push(`${basePath}/${readout.id}?tab=${tab}`);
  }

  return (
    <div className="space-y-4">
      <section className="sticky top-[calc(var(--app-top-banner-height)+8px)] z-20 rounded-xl border border-[#D4DAD4] bg-white">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3">
          <p className="text-xs text-[#8A9A8C]">{breadcrumbs}</p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusPill(readout.status)}`}>
              {readout.status}
            </span>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-[#D4DAD4]"
              disabled={saving}
              onClick={saveDraft}
            >
              {saving ? "Saving..." : "Save draft"}
            </Button>
            <Button
              type="button"
              className="rounded-full bg-[#386B45] text-white hover:bg-[#2E5738]"
              onClick={() => setPublishOpen(true)}
            >
              Publish update
            </Button>
          </div>
        </div>
        <div className="flex gap-1 border-t border-[#D4DAD4] px-4">
          {(["intro", "findings", "outro"] as EditorTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => updateTab(tab)}
              className={`px-4 py-2 text-sm ${
                activeTab === tab
                  ? "border-b-2 border-[#386B45] font-bold text-[#386B45]"
                  : "border-b-2 border-transparent text-[#6E7E96]"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <div className="rounded-xl border border-[#D4DAD4] bg-[#F5F8F5] p-4">
        {activeTab === "intro" ? (
          <ReadoutIntroForm
            intro={readout.intro}
            onChange={(nextIntro: ReadoutIntro) =>
              setReadout((current) => ({
                ...current,
                intro: nextIntro,
              }))
            }
            onSave={() => persistReadout({ intro: readout.intro })}
          />
        ) : null}

        {activeTab === "findings" ? (
          <ReadoutFindingsForm
            readoutId={readout.id}
            surveyWaveLabel={readout.surveyWaveLabel}
            findings={readout.findings}
            onChange={(nextFindings: ReadoutFinding[]) =>
              setReadout((current) => ({
                ...current,
                findings: nextFindings,
              }))
            }
            onSynced={(nextFindings) =>
              setReadout((current) => ({
                ...current,
                findings: nextFindings,
              }))
            }
            onSave={() => persistReadout({ findings: readout.findings })}
          />
        ) : null}

        {activeTab === "outro" ? (
          <ReadoutOutroForm
            outro={readout.outro}
            onChange={(nextOutro: ReadoutOutro) =>
              setReadout((current) => ({
                ...current,
                outro: nextOutro,
              }))
            }
            onSave={() => persistReadout({ outro: readout.outro })}
          />
        ) : null}
      </div>

      <div className="flex justify-between">
        <Button asChild variant="outline" className="rounded-full border-[#D4DAD4]">
          <Link href={basePath}>Back to readouts</Link>
        </Button>
      </div>

      <ReadoutPublishModal
        open={publishOpen}
        readout={readout}
        clientName={clientName}
        onOpenChange={setPublishOpen}
        onPublish={async () => {
          const response = await fetch(`/api/portal/readouts/${readout.id}/publish`, {
            method: "POST",
          });
          const payload = (await response.json()) as { readout?: Readout; error?: string };
          if (!response.ok || !payload.readout) {
            alert(payload.error || "Unable to publish readout.");
            return;
          }
          setReadout(payload.readout);
          setPublishOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
