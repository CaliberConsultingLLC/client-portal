import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-2">
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/portal">
            <Logo size="sm" />
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/portal/reports"
              className="text-sm font-medium text-text-secondary hover:text-text-primary"
            >
              Reports
            </Link>
            <Link
              href="/portal/surveys"
              className="text-sm font-medium text-text-secondary hover:text-text-primary"
            >
              Surveys
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
