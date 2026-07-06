import type { Metadata } from "next";
import { AppTopBanner } from "@/components/shared/app-top-banner";

export const metadata: Metadata = {
  title: "Employee Experience Dashboard",
};

export default function EmployeeExperienceLayout({
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
          { label: "Employee Experience", href: "/employee-experience/dws" },
        ]}
      />
      {children}
    </div>
  );
}
