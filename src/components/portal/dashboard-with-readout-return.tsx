"use client";

import { Suspense, type ReactNode } from "react";
import { BackToReadoutButton } from "@/components/portal/back-to-readout-button";

export function DashboardWithReadoutReturn({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <BackToReadoutButton />
      </Suspense>
      {children}
    </>
  );
}
