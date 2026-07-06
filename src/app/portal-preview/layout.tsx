import Link from "next/link";
import { Eye } from "lucide-react";
import { AppTopBanner } from "@/components/shared/app-top-banner";

export default function PortalPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#EEF2EE]">
      <AppTopBanner
        brand="caliber"
        homeHref="/portal-preview"
        eyebrow="Preview Workspace"
        items={[
          { label: "Home", href: "/portal-preview" },
          { label: "Dashboards", href: "/portal-preview/dashboards" },
          { label: "Reports", href: "/portal-preview/reports" },
          { label: "Documents", href: "/portal-preview/documents" },
          { label: "Resources", href: "/portal-preview/resources" },
        ]}
      >
        <div className="flex items-center gap-2 rounded-full bg-[#EEF3F6] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#386B45]">
          <Eye className="h-3.5 w-3.5" />
          Preview Mode
        </div>
        <Link
          href="/login"
          className="rounded-full border border-[#C9D2D8] bg-white px-4 py-2 text-sm font-medium text-[#2B2B2B] transition-colors hover:bg-[#F5F8FA]"
        >
          View Login
        </Link>
      </AppTopBanner>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
