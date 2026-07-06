import { redirect } from "next/navigation";

export default function DeprecatedAdminCampaignDetailPage() {
  redirect("/portal/campaigns");
}
