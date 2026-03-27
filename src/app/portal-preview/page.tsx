import Link from "next/link";
import { Eye, ExternalLink } from "lucide-react";
import { CaliberLogo } from "@/components/shared/caliber-logo";
import { PortalHomeContent } from "@/components/portal/portal-home-content";
import { Button } from "@/components/ui/button";

export default function PortalPreviewPage() {
  return (
    <div className="min-h-screen bg-[#EEF2F4]">
      <header className="sticky top-0 z-40 border-b border-[#D6DEE3] bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <CaliberLogo size="sm" />
            <div className="hidden h-8 w-px bg-[#D6DEE3] lg:block" />
            <div className="flex items-center gap-2 rounded-full bg-[#EEF3F6] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#18384E]">
              <Eye className="h-3.5 w-3.5" />
              Preview Mode
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
              <Link href="/portal-login">
                View Login Screen
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild className="rounded-full bg-[#102F4A] text-white hover:bg-[#0C2740]">
              <Link href="/portal-preview">Refresh Preview</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <PortalHomeContent basePath="/portal-preview" />
      </main>
    </div>
  );
}
