import { Suspense } from "react";
import { CollaborationDemoEnvironment } from "@/components/collaboration/demo-environment";

export default function CollaborationDemoPage() {
  return (
    <Suspense fallback={<div className="min-h-[320px]" />}>
      <CollaborationDemoEnvironment />
    </Suspense>
  );
}
