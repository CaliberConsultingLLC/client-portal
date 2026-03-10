import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { CollaborationDashboardClient } from "./dashboard-client";
import type { CollaborationData } from "@/types/collaboration";

type PageProps = { params: Promise<{ slug: string }> };

export default async function CollaborationSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: campaign, error } = await supabase
    .from("collab_campaigns")
    .select("id, name, slug, status, processed_data, organization:organizations(name)")
    .eq("slug", slug)
    .eq("status", "ready")
    .single();

  if (error || !campaign || !campaign.processed_data) {
    notFound();
  }

  const orgName =
    Array.isArray(campaign.organization)
      ? campaign.organization[0]?.name ?? ""
      : (campaign.organization as { name: string } | null)?.name ?? "";

  return (
    <CollaborationDashboardClient
      data={campaign.processed_data as unknown as CollaborationData}
      campaignName={campaign.name}
      organizationName={orgName}
    />
  );
}
