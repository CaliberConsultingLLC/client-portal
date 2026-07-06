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
        homeHref="/login"
        items={[
          { label: "Home", href: "/login" },
          { label: "Collaboration", href: "/collaboration" },
          { label: "Integration", href: "/integration-effectiveness" },
          { label: "Employee Experience", href: "/employee-experience/dws" },
        ]}
      />
      {children}
    </div>
  );
}
