import Link from "next/link";
import { AppTopBanner } from "@/components/shared/app-top-banner";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <AppTopBanner
        eyebrow="Secure Access"
        items={[
          { label: "Home", href: "/" },
          { label: "Services", href: "/services" },
          { label: "Portal Login", href: "/login" },
          { label: "Sign In", href: "/sign-in", exact: true },
        ]}
      >
        <Link
          href="/contact"
          className="rounded-full border border-[#C9D2D8] bg-white px-4 py-2 text-sm font-medium text-[#102533] transition-colors hover:bg-[#F5F8FA]"
        >
          Contact
        </Link>
      </AppTopBanner>
      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        {children}
      </main>
    </div>
  );
}
