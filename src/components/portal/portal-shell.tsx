"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  FileText,
  FolderOpen,
  LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CaliberLogo } from "@/components/shared/caliber-logo";
import { FirebaseSignOutButton } from "@/components/auth/firebase-sign-out-button";

const navItems = [
  { label: "Home", href: "/portal", icon: LayoutDashboard },
  { label: "Clients", href: "/portal/clients", icon: Building2 },
  { label: "Dashboards", href: "/portal/dashboards", icon: BarChart3 },
  { label: "Reports", href: "/portal/reports", icon: FileText },
  { label: "Documents", href: "/portal/documents", icon: FolderOpen },
  { label: "Resources", href: "/portal/resources", icon: LifeBuoy },
];

interface PortalShellProps {
  children: React.ReactNode;
  userName?: string | null;
  roleLabel?: string | null;
}

export function PortalShell({ children, userName, roleLabel }: PortalShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#EEF2F4]">
      <header className="sticky top-0 z-50 border-b border-[#D6DEE3] bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <Link href="/portal">
              <CaliberLogo size="sm" />
            </Link>
            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/portal" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[#102F4A] text-white"
                        : "text-[#516873] hover:bg-[#E9EEF1] hover:text-[#102533]"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center justify-between gap-4 lg:justify-end">
            <div className="text-right">
              <p className="text-sm font-semibold text-[#102533]">{userName || "Portal User"}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-[#6C818C]">
                {roleLabel || "Client Access"}
              </p>
            </div>
            <FirebaseSignOutButton
              redirectTo="/portal-login"
              variant="outline"
              className="rounded-full border-[#C9D2D8] bg-white px-4 text-[#102533] hover:bg-[#F5F8FA]"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
