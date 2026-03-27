import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employee Experience Dashboard",
};

export default function EmployeeExperienceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-surface-2">{children}</div>;
}
