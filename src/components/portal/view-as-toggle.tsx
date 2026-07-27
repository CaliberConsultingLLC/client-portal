"use client";

import { useState } from "react";
import { Check, ChevronDown, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ViewAsUserOption {
  uid: string;
  name: string;
  email: string;
  role: string;
}

interface ViewAsToggleProps {
  isViewingAsUser: boolean;
  viewingAsUserUid?: string | null;
  users: ViewAsUserOption[];
}

export function ViewAsToggle({
  isViewingAsUser,
  viewingAsUserUid,
  users,
}: ViewAsToggleProps) {
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const busy = saving;

  const activeUser = users.find((item) => item.uid === viewingAsUserUid) ?? null;
  function navigateViewAs(uid?: string) {
    setOpen(false);
    setSaving(true);
    const ts = Date.now();
    const target = uid
      ? `/api/portal/view-as?uid=${encodeURIComponent(uid)}&next=${encodeURIComponent("/portal")}&ts=${ts}`
      : `/api/portal/view-as?next=${encodeURIComponent("/portal")}&ts=${ts}`;
    window.location.assign(target);
  }

  const label = isViewingAsUser
    ? (activeUser?.name ?? "User")
    : "View as";

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((value) => !value)}
        disabled={busy}
        className={
          isViewingAsUser
            ? "rounded-xl border border-[#D7B35A] bg-[#D7B35A] px-3 text-[13px] text-[#242424] hover:bg-[#E8CC70]"
            : "rounded-xl border border-transparent px-3 text-[13px] text-white/70 hover:border-[#386B45] hover:bg-[#386B45] hover:text-white"
        }
      >
        {isViewingAsUser ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        {busy ? "Switching…" : label}
        <ChevronDown className="h-3 w-3 opacity-70" />
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
              Preview as user
            </p>
            <div className="max-h-72 overflow-y-auto py-1">
              {users.map((item) => {
                const isActive = isViewingAsUser && item.uid === viewingAsUserUid;
                return (
                  <button
                    key={item.uid}
                    type="button"
                    onClick={() => navigateViewAs(item.uid)}
                    className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm text-white/84 hover:bg-[#386B45] hover:text-white"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.name}</span>
                      <span className="block truncate text-[11px] text-white/60">{item.email}</span>
                    </span>
                    {isActive ? <Check className="h-4 w-4 shrink-0 text-[#E8CC70]" /> : null}
                  </button>
                );
              })}
            </div>
            {isViewingAsUser ? (
              <div className="mt-1 border-t border-white/10 pt-1">
                <button
                  type="button"
                  onClick={() => navigateViewAs()}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-[#E8CC70] hover:bg-[#386B45] hover:text-white"
                >
                  <EyeOff className="h-4 w-4" />
                  Exit user view
                </button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
