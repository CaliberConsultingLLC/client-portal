import { PortalShell } from "@/components/portal/portal-shell";
import { requireFirebasePortalUser } from "@/lib/firebase/auth";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireFirebasePortalUser();
  const roleLabel =
    user.role === "super_admin" || user.role === "internal_admin"
      ? "Internal Admin"
      : user.role === "client_admin"
      ? "Client Admin"
      : user.role === "client_viewer"
        ? "Client Viewer"
        : "Internal Access";

  return (
    <PortalShell userName={user.fullName ?? user.email} roleLabel={roleLabel}>
      {children}
    </PortalShell>
  );
}
