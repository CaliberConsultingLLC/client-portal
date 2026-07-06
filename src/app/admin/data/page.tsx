import { redirect } from "next/navigation";

export default function DeprecatedAdminDataPage() {
  redirect("/portal/workspace-map");
}
