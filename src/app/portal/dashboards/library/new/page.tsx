import { notFound } from "next/navigation";
import { DashboardProductWorkbench } from "@/components/portal/dashboard-product-workbench";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getFirebasePortalClients } from "@/lib/firebase/portal-store";

export default async function NewDashboardPage() {
  const user = await requireFirebasePortalUser();

  if (!isInternalFirebaseRole(user.role)) {
    notFound();
  }

  const clients = await getFirebasePortalClients();

  return (
    <DashboardProductWorkbench mode="create" clients={clients} instances={[]} />
  );
}
