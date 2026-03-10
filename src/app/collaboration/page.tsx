"use client";

import { CollaborationDashboardClient } from "./[slug]/dashboard-client";

import type { CollaborationData } from "@/types/collaboration";
import rawData from "@/data/collaboration-data.json";

const data = rawData as CollaborationData;

/**
 * /collaboration — Static demo dashboard using pre-processed DWS data.
 * Per-client dashboards live at /collaboration/[slug] and load data from Supabase.
 */
export default function CollaborationDemoPage() {
  return (
    <CollaborationDashboardClient
      data={data}
      campaignName="Collaboration Campaign"
      organizationName=""
    />
  );
}
