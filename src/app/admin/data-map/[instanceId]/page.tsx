import { redirect } from "next/navigation";

export default async function DeprecatedAdminDataMapPage({
  params,
}: {
  params: Promise<{ instanceId: string }>;
}) {
  const { instanceId } = await params;
  redirect(`/portal/dashboards/instances/${instanceId}/data-map`);
}
