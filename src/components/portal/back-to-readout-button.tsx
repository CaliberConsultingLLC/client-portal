"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buildReadoutReturnHref } from "@/lib/readout/deck-constants";

/** Shown only when a dashboard was opened from a readout deep-link (`returnTo`). */
export function BackToReadoutButton() {
  const searchParams = useSearchParams();
  const href = buildReadoutReturnHref(
    searchParams.get("returnTo"),
    searchParams.get("slide")
  );

  if (!href) return null;

  return (
    <Link
      href={href}
      title="Return to the executive readout"
      className="fixed bottom-4 left-6 z-[60] inline-flex items-center gap-2 rounded-full border border-[#C9AF6E] bg-[linear-gradient(135deg,#E8CC70,#C99A3C)] px-5 py-3 text-[13px] font-bold text-[#242424] shadow-[0_8px_24px_rgba(201,154,60,0.35)] hover:shadow-[0_10px_28px_rgba(201,154,60,0.5)]"
    >
      <span aria-hidden>←</span> Back to readout
    </Link>
  );
}
