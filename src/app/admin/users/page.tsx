import { redirect } from "next/navigation";

export default function DeprecatedAdminUsersPage() {
  redirect("/portal/users");
}
