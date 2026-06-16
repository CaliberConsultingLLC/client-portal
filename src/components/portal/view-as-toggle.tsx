"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ViewAsClientOption {
  id: string;
  name: string;
  isDemo?: boolean;
}

interface ViewAsToggleProps {
  isViewingAsClient: boolean;
  viewingAsClientId?: string | null;
  clients: ViewAsClientOption[];
}

export function ViewAsToggle({
  isViewingAsClient,
  viewingAsClientId,
  clients,
}: ViewAsToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = saving || isPending;
  const activeClient = clients.find((client) => client.id === viewingAsClientId) ?? null;

  async function apply(enabled: boolean, clientId?: string) {
    setOpen(false);
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/portal/view-as", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, clientId }),
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to switch client view");
      }
      // Role is resolved server-side, so refresh and land on Home to reflect it.
      startTransition(() => {
        router.replace("/portal");
        router.refresh();
      });
    } catch {
      setError("Unable to update client view.");
    } finally {
      setSaving(false);
    }
  }

  const label = isViewingAsClient
    ? `Viewing as: ${activeClient?.name ?? "Client"}`
    : "View as client";

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen((value) => !value)}
        disabled={busy}
        className={
          isViewingAsClient
            ? "rounded-full border-[#D7B35A] bg-[#D7B35A] px-4 text-[#242424] hover:bg-[#E8CC70]"
            : "rounded-full border-[#D7B35A]/35 bg-white/8 px-4 text-white hover:bg-[#386B45]"
        }
      >
        {isViewingAsClient ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {busy ? "Switching…" : label}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </Button>

      {open ? (
        <>
          {/* Click-away backdrop */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[#363636] bg-[#242424] py-2 shadow-[0_18px_48px_rgba(0,0,0,0.32)]">
            <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
              Preview portal as
            </p>
            <div className="max-h-72 overflow-y-auto py-1">
              {clients.map((client) => {
                const isActive = isViewingAsClient && client.id === viewingAsClientId;
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => apply(true, client.id)}
                    className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm text-white/84 hover:bg-[#386B45] hover:text-white"
                  >
                    <span className="truncate">
                      {client.name}
                      {client.isDemo ? (
                        <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/60">
                          Demo
                        </span>
                      ) : null}
                    </span>
                    {isActive ? <Check className="h-4 w-4 shrink-0 text-[#E8CC70]" /> : null}
                  </button>
                );
              })}
            </div>
            {isViewingAsClient ? (
              <div className="mt-1 border-t border-white/10 pt-1">
                <button
                  type="button"
                  onClick={() => apply(false)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-[#E8CC70] hover:bg-[#386B45] hover:text-white"
                >
                  <EyeOff className="h-4 w-4" />
                  Exit client view
                </button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
      {error ? (
        <p className="absolute right-0 mt-2 whitespace-nowrap rounded-lg bg-[#8A3D3A] px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
          {error}
        </p>
      ) : null}
    </div>
  );
}
