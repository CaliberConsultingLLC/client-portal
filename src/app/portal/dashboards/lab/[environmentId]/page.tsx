import { notFound } from "next/navigation";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getInternalDemoEnvironment } from "@/lib/portal/internal-demo-environments";
import { renderInternalDemoEnvironment } from "@/lib/portal/render-internal-demo-environment";

interface InternalDemoLabPageProps {
  params: Promise<{
    environmentId: string;
  }>;
}

export default async function InternalDemoLabPage({ params }: InternalDemoLabPageProps) {
  const user = await requireFirebasePortalUser();

  if (!isInternalFirebaseRole(user.role)) {
    notFound();
  }

  const { environmentId } = await params;
  const environment = getInternalDemoEnvironment(environmentId);

  if (!environment) {
    notFound();
  }

  const renderedEnvironment = await renderInternalDemoEnvironment(environment);

  if (!renderedEnvironment) {
    notFound();
  }

  return renderedEnvironment;
}
