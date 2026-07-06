import { redirect } from "next/navigation";

export default async function DeprecatedAdminReadoutEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/portal/readouts/${id}`);
}
