import { Suspense } from "react";
import { CollaborationDemoEnvironment } from "@/components/collaboration/demo-environment";

export default function CollaborationScenarioDemoPage() {
  return (
    <Suspense fallback={<div className="min-h-[320px]" />}>
      <CollaborationDemoEnvironment />
    </Suspense>
  );
}

