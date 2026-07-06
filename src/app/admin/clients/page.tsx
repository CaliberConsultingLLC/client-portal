import { redirect } from "next/navigation";

export default function DeprecatedAdminClientsPage() {
  redirect("/portal/clients");
}
