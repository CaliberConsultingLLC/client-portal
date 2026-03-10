import { NspLogoMark } from "./nsp-logo-mark";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-pulse">
          <NspLogoMark size={48} />
        </div>
        <p className="text-sm font-medium text-text-muted">Loading...</p>
      </div>
    </div>
  );
}
