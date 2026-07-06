import { redirect } from "next/navigation";

export default async function DeprecatedSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectPath } = await searchParams;

  if (redirectPath) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  redirect("/login");
}
