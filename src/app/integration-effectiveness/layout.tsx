import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integration Effectiveness Index",
};

export default function IntegrationEffectivenessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-surface-2">{children}</div>;
}
