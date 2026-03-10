"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Megaphone,
  ClipboardList,
  Database,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";

const sidebarLinks = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Clients", href: "/admin/clients", icon: Building2 },
  { label: "Campaigns", href: "/admin/campaigns", icon: Megaphone },
  { label: "Surveys", href: "/admin/surveys", icon: ClipboardList },
  { label: "Data", href: "/admin/data", icon: Database },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-surface-2">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border-default bg-white">
        {/* Logo */}
        <div className="flex h-16 items-center px-5">
          <Link href="/admin">
            <Logo size="sm" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {sidebarLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/admin" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-[--radius-md] px-3 py-2.5 text-sm font-medium transition-colors duration-[180ms]",
                  isActive
                    ? "bg-nsp-blue-50 text-nsp-blue-600"
                    : "text-text-secondary hover:bg-surface-3 hover:text-text-primary"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-border-subtle px-3 py-4">
          <button className="flex w-full items-center gap-3 rounded-[--radius-md] px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary">
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 pl-60">
        <main className="mx-auto max-w-6xl px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
