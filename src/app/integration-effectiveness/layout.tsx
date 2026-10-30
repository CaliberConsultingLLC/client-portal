import type { Metadata } from "next";
import { AppTopBanner } from "@/components/shared/app-top-banner";

export const metadata: Metadata = {
  title: "Integration Effectiveness Index",
};

export default function IntegrationEffectivenessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-2">
      <AppTopBanner
        brand="caliber"
        homeHref="/portal"
        tone="dark"
        items={[
          { label: "Home", href: "/portal", exact: true },
          { label: "Dashboards", href: "/portal/dashboards" },
          { label: "Reports", href: "/portal/reports" },
          { label: "Documents", href: "/portal/documents" },
          { label: "Resources", href: "/portal/resources" },
          { label: "Integration Effectiveness", href: "/integration-effectiveness/csg" },
        ]}
      />
      {children}
    </div>
  );
}
