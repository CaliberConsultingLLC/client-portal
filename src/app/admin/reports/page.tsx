import { redirect } from "next/navigation";

export default function DeprecatedAdminReportsPage() {
  redirect("/portal/insights");
}
