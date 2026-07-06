import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireFirebasePortalUser();

  if (!isInternalFirebaseRole(user.role)) {
    redirect("/portal");
  }

  return (
    <>
      <div className="border-b border-[#D4DAD4] bg-[#FDF4E3] px-8 py-3 text-sm text-[#8A5E0A]">
        This admin workspace is being retired. Use the{" "}
        <Link href="/portal" className="font-semibold underline">
          portal
        </Link>{" "}
        for clients, dashboards, census, campaigns, and{" "}
        <Link href="/portal/readouts" className="font-semibold underline">
          readouts
        </Link>
        .
      </div>
      <AdminShell>{children}</AdminShell>
    </>
  );
}
