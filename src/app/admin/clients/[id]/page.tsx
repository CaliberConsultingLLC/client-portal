import { redirect } from "next/navigation";

export default function DeprecatedAdminClientDetailPage() {
  redirect("/portal/clients");
}
