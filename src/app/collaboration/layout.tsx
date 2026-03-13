import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collaboration Campaign Dashboard",
};

export default function CollaborationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-2">
      {children}
    </div>
  );
}
