import { Compass } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin text-nsp-blue-500">
          <Compass className="h-10 w-10" strokeWidth={2} />
        </div>
        <p className="text-sm font-medium text-text-muted">Loading...</p>
      </div>
    </div>
  );
}
