import { redirect } from "next/navigation";

export default function DeprecatedAdminSurveysPage() {
  redirect("/portal/campaigns");
}
