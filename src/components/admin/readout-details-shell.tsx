"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { buildDefaultReadoutDeck } from "@/lib/readout/default-deck";
import type { Readout, ReadoutAccessMode } from "@/types/readout";
import { ReadoutPublishModal } from "./readout-publish-modal";

export interface ReadoutClientUserOption {
  uid: string;
  name: string;
  email: string;
  role: string;
}

interface ReadoutDetailsShellProps {
  initialReadout: Readout;
  clientName: string;
  surveyWaves?: string[];
  clientUsers?: ReadoutClientUserOption[];
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

function statusLabel(status: Readout["status"]) {
  if (status === "published") return "Available";
  if (status === "inactive") return "Hidden";
  return "Draft";
}

export function ReadoutDetailsShell({
  initialReadout,
  clientName,
  surveyWaves = [],
  clientUsers = [],
  basePath = "/portal/readouts",
}: ReadoutDetailsShellProps) {
  const router = useRouter();
  const [readout, setReadout] = useState(initialReadout);
  const [saving, setSaving] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  const deck = readout.deck ?? buildDefaultReadoutDeck(clientName);
  const accessMode: ReadoutAccessMode =
    readout.accessMode === "selected_users" ? "selected_users" : "all_client_users";
  const allowedUserIds = readout.allowedUserIds ?? [];

  const breadcrumbs = useMemo(
    () => ["Portal", clientName, "Readouts", readout.name].join(" › "),
    [clientName, readout.name]
  );

  async function persist(patch: Record<string, unknown>) {
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

  async function saveDetails() {
    await persist({
      name: readout.name,
      surveyWaveLabel: readout.surveyWaveLabel ?? null,
      accessMode,
      allowedUserIds,
      deck: {
        ...deck,
        waveLabel: deck.waveLabel,
        cover: {
          ...deck.cover,
          preparedForName: deck.cover.preparedForName,
          preparedByName: deck.cover.preparedByName,
          logoUrl: deck.cover.logoUrl?.trim() || null,
        },
      },
    });
  }

  async function setAvailability(available: boolean) {
    setTogglingAvailability(true);
    try {
      const response = await fetch(`/api/portal/readouts/${readout.id}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available }),
      });
      const payload = (await response.json()) as { readout?: Readout; error?: string };
      if (!response.ok || !payload.readout) {
        alert(payload.error || "Unable to update availability.");
        return;
      }
      setReadout(payload.readout);
      router.refresh();
    } finally {
      setTogglingAvailability(false);
    }
  }

  function toggleUser(uid: string) {
    setReadout((current) => {
      const currentIds = current.allowedUserIds ?? [];
      const nextIds = currentIds.includes(uid)
        ? currentIds.filter((id) => id !== uid)
        : [...currentIds, uid];
      return { ...current, allowedUserIds: nextIds };
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-6 py-8">
      <section className="rounded-xl border border-[#D4DAD4] bg-white">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3">
          <p className="text-xs text-[#8A9A8C]">{breadcrumbs}</p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusPill(readout.status)}`}>
              {statusLabel(readout.status)}
            </span>
            <Button asChild variant="outline" className="rounded-full border-[#D4DAD4]">
              <Link href={`${basePath}/${readout.id}/modify`}>Modify</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-[#D4DAD4]"
              disabled={saving}
              onClick={() => void saveDetails()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            {readout.status === "published" ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-[#D4DAD4]"
                disabled={togglingAvailability}
                onClick={() => void setAvailability(false)}
              >
                {togglingAvailability ? "Updating…" : "Hide from clients"}
              </Button>
            ) : (
              <Button
                type="button"
                className="rounded-full bg-[#386B45] text-white hover:bg-[#2E5738]"
                disabled={togglingAvailability}
                onClick={() => {
                  if (readout.status === "draft") {
                    setPublishOpen(true);
                    return;
                  }
                  void setAvailability(true);
                }}
              >
                {readout.status === "inactive"
                  ? togglingAvailability
                    ? "Updating…"
                    : "Make available"
                  : "Publish"}
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-[#D4DAD4] bg-white p-6">
        <div>
          <h1 className="text-2xl font-bold text-[#152238]">Readout details</h1>
          <p className="mt-1 text-sm text-[#6E7E96]">
            Basic metadata for this readout. Open Modify to edit the slide deck itself.
          </p>
        </div>

        <Input
          label="Name"
          value={readout.name}
          onChange={(event) => setReadout((current) => ({ ...current, name: event.target.value }))}
        />

        <Select
          label="Survey wave"
          value={readout.surveyWaveLabel ?? ""}
          onChange={(event) =>
            setReadout((current) => ({
              ...current,
              surveyWaveLabel: event.target.value || null,
            }))
          }
        >
          <option value="">No survey wave linked</option>
          {surveyWaves.map((wave) => (
            <option key={wave} value={wave}>
              {wave}
            </option>
          ))}
        </Select>

        <Input
          label="Wave label (cover kicker)"
          value={deck.waveLabel}
          onChange={(event) =>
            setReadout((current) => ({
              ...current,
              deck: {
                ...(current.deck ?? deck),
                waveLabel: event.target.value,
              },
            }))
          }
          placeholder="Wave 3 · June 2026"
        />

        <Input
          label="Client logo URL"
          value={deck.cover.logoUrl ?? ""}
          onChange={(event) =>
            setReadout((current) => {
              const nextDeck = current.deck ?? deck;
              return {
                ...current,
                deck: {
                  ...nextDeck,
                  cover: { ...nextDeck.cover, logoUrl: event.target.value || null },
                },
              };
            })
          }
          placeholder="/deep-well-services-logo.png or https://…"
        />

        <Input
          label="Prepared for"
          value={deck.cover.preparedForName}
          onChange={(event) =>
            setReadout((current) => {
              const nextDeck = current.deck ?? deck;
              return {
                ...current,
                deck: {
                  ...nextDeck,
                  cover: { ...nextDeck.cover, preparedForName: event.target.value },
                },
              };
            })
          }
        />

        <Input
          label="Prepared by"
          value={deck.cover.preparedByName}
          onChange={(event) =>
            setReadout((current) => {
              const nextDeck = current.deck ?? deck;
              return {
                ...current,
                deck: {
                  ...nextDeck,
                  cover: { ...nextDeck.cover, preparedByName: event.target.value },
                },
              };
            })
          }
        />
      </section>

      <section className="space-y-4 rounded-xl border border-[#D4DAD4] bg-white p-6">
        <div>
          <h2 className="text-lg font-bold text-[#152238]">Client access</h2>
          <p className="mt-1 text-sm text-[#6E7E96]">
            Control who on {clientName} can open this readout in Insights when it is Available.
          </p>
        </div>

        <Select
          label="Who can view"
          value={accessMode}
          onChange={(event) =>
            setReadout((current) => ({
              ...current,
              accessMode: event.target.value as ReadoutAccessMode,
            }))
          }
        >
          <option value="all_client_users">All users on this client</option>
          <option value="selected_users">Selected users only</option>
        </Select>

        {accessMode === "selected_users" ? (
          <div className="rounded-xl border border-[#D4DAD4] bg-[#F7F9F7]">
            <div className="border-b border-[#D4DAD4] px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6E7E96]">
                Assigned users ({allowedUserIds.length})
              </p>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-[#E4EAE4]">
              {clientUsers.length === 0 ? (
                <p className="px-4 py-4 text-sm text-[#6E7E96]">
                  No active users found for this client.
                </p>
              ) : (
                clientUsers.map((user) => {
                  const checked = allowedUserIds.includes(user.uid);
                  return (
                    <label
                      key={user.uid}
                      className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={() => toggleUser(user.uid)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[#152238]">
                          {user.name}
                        </span>
                        <span className="block truncate text-xs text-[#6E7E96]">
                          {user.email} · {user.role}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <p className="border-t border-[#D4DAD4] px-4 py-3 text-xs text-[#6E7E96]">
              Save after changing the checklist. Hidden/Available is separate and can be toggled
              instantly.
            </p>
          </div>
        ) : (
          <p className="rounded-xl border border-[#E8F0EA] bg-[#F5FAF6] px-4 py-3 text-sm text-[#386B45]">
            Every active user assigned to this client will see this readout when it is Available.
          </p>
        )}
      </section>

      <div className="flex justify-between">
        <Button asChild variant="outline" className="rounded-full border-[#D4DAD4]">
          <Link href={basePath}>Back to readouts</Link>
        </Button>
        <Button asChild className="rounded-full bg-[#386B45] text-white hover:bg-[#2E5738]">
          <Link href={`${basePath}/${readout.id}/modify`}>Open &amp; modify deck</Link>
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
