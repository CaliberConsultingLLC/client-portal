import { notFound } from "next/navigation";
import { PerspectiveProductWorkbench } from "@/components/portal/perspective-product-workbench";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getFirebaseDashboards } from "@/lib/firebase/dashboard-store";

export default async function NewPerspectivePage() {
  const user = await requireFirebasePortalUser();

  if (!isInternalFirebaseRole(user.role)) {
    notFound();
  }

  const dashboards = await getFirebaseDashboards();

  return <PerspectiveProductWorkbench mode="create" dashboards={dashboards} dashboardInstances={[]} instances={[]} />;
}
