"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Readout } from "@/types/readout";

interface ReadoutListClient {
  id: string;
  name: string;
}

interface ReadoutListProps {
  clients: ReadoutListClient[];
  surveyWavesByClientId: Record<string, string[]>;
  readouts: Readout[];
  initialClientId: string;
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

export function ReadoutList({
  clients,
  surveyWavesByClientId,
  readouts,
  initialClientId,
  basePath = "/admin/readouts",
}: ReadoutListProps) {
  const router = useRouter();
  const [selectedClientId, setSelectedClientId] = useState(initialClientId);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSurveyWaveLabel, setNewSurveyWaveLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? clients[0] ?? null,
    [clients, selectedClientId]
  );

  const clientReadouts = useMemo(
    () =>
      readouts
        .filter((readout) => readout.clientId === selectedClientId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [readouts, selectedClientId]
  );

  const clientSurveyWaves = useMemo(
    () => surveyWavesByClientId[selectedClientId] ?? [],
    [surveyWavesByClientId, selectedClientId]
  );

  async function createReadout() {
    if (!selectedClientId || !newName.trim()) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/portal/readouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          surveyWaveLabel: newSurveyWaveLabel || null,
          name: newName.trim(),
        }),
      });
      const payload = (await response.json()) as { readout?: Readout; error?: string };

      if (!response.ok || !payload.readout) {
        throw new Error(payload.error || "Unable to create readout.");
      }

      router.push(`${basePath}/${payload.readout.id}?tab=intro`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to create readout.");
    } finally {
      setSaving(false);
    }
  }

  async function publishReadout(readoutId: string) {
    const response = await fetch(`/api/portal/readouts/${readoutId}/publish`, { method: "POST" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      alert(payload.error ?? "Unable to publish readout.");
      return;
    }
    router.refresh();
  }

  async function deleteReadout(readoutId: string) {
    const confirmed = window.confirm(
      "Delete this draft readout? This action cannot be undone and will remove all draft content."
    );
    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/portal/readouts/${readoutId}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      alert(payload.error ?? "Unable to delete readout.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-[#D4DAD4] bg-[#EEF2EE]">
      <div className="grid min-h-[680px] grid-cols-[220px_1fr]">
        <aside className="border-r border-[#D4DAD4] bg-[#F5F8F5] px-3 py-5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A9A8C]">Clients</p>
          <div className="mt-2 space-y-1">
            {clients.map((client) => {
              const active = client.id === selectedClientId;
              const count = readouts.filter((readout) => readout.clientId === client.id).length;
              return (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedClientId(client.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left ${
                    active ? "bg-[#E4EDE5]" : "hover:bg-[#ECF2ED]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      active ? "bg-[#386B45]" : "bg-[#C7D0D8]"
                    }`}
                  />
                  <span className={`text-sm ${active ? "font-semibold text-[#152238]" : "text-[#6E7E96]"}`}>
                    {client.name}
                  </span>
                  {count > 0 ? (
                    <span className="ml-auto rounded-full bg-[#C8E0CB] px-2 py-0.5 text-[10px] font-bold text-[#386B45]">
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="px-8 py-7">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#8A9A8C]">{selectedClient?.name ?? "Client"}</p>
              <h1 className="text-2xl font-bold text-[#152238]">Readouts</h1>
            </div>
            <Button
              type="button"
              onClick={() => setCreating((value) => !value)}
              className="rounded-full bg-[#386B45] text-white hover:bg-[#2E5738]"
            >
              <Plus className="h-4 w-4" />
              New readout
            </Button>
          </div>

          {creating ? (
            <div className="mb-5 grid gap-3 rounded-xl border border-[#D4DAD4] bg-white p-4 md:grid-cols-3">
              <Input
                label="Readout name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Oct 2025 EE Readout"
              />
              <Select
                label="Survey wave"
                value={newSurveyWaveLabel}
                onChange={(event) => setNewSurveyWaveLabel(event.target.value)}
              >
                <option value="">No survey wave linked</option>
                {clientSurveyWaves.map((wave) => (
                  <option key={wave} value={wave}>
                    {wave}
                  </option>
                ))}
              </Select>
              <div className="flex items-end justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-[#D4DAD4]"
                  onClick={() => setCreating(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="rounded-full bg-[#386B45] text-white hover:bg-[#2E5738]"
                  disabled={saving || !newName.trim()}
                  onClick={createReadout}
                >
                  {saving ? "Creating..." : "Create draft"}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-[#D4DAD4] bg-white">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[#F1F5F1]">
                <tr className="border-b-2 border-[#D4DAD4] text-left text-[11px] uppercase tracking-[0.1em] text-[#6E7E96]">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Survey wave</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clientReadouts.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-sm text-[#6E7E96]" colSpan={5}>
                      No readouts yet for this client.
                    </td>
                  </tr>
                ) : (
                  clientReadouts.map((readout) => (
                    <tr key={readout.id} className="border-b border-[#EEF2EE] last:border-b-0">
                      <td className="px-4 py-3 font-semibold text-[#152238]">{readout.name}</td>
                      <td className="px-4 py-3 text-[#3B4B63]">
                        {readout.surveyWaveLabel ?? "No survey wave linked"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusPill(
                            readout.status
                          )}`}
                        >
                          {readout.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6E7E96]">
                        {new Date(readout.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold">
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`${basePath}/${readout.id}?tab=intro`} className="text-[#386B45]">
                            Edit
                          </Link>
                          {readout.status === "published" ? (
                            <Link href="/portal/insights" className="text-[#6E7E96]">
                              View
                            </Link>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="text-[#5E7898]"
                                onClick={() => publishReadout(readout.id)}
                              >
                                Publish
                              </button>
                              <button
                                type="button"
                                className="text-[#C96B60]"
                                onClick={() => deleteReadout(readout.id)}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs italic text-[#8A9A8C]">
            Survey waves come from CSV analytics data. Only published readouts appear in the client&apos;s
            Insights tab.
          </p>
        </section>
      </div>
    </div>
  );
}
