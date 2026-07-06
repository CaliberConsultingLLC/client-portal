"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitCompareArrows,
  Database,
  MapPin,
  BookText,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { AppTopBanner } from "@/components/shared/app-top-banner";
import { FirebaseSignOutButton } from "@/components/auth/firebase-sign-out-button";
import { cn } from "@/lib/utils";

const sidebarLinks = [
  { label: "Portal home", href: "/portal", icon: LayoutDashboard },
  { label: "Workspace map", href: "/portal/workspace-map", icon: MapPin },
  { label: "Readouts", href: "/portal/readouts", icon: BookText },
  { label: "Collab pipeline", href: "/admin/collab", icon: GitCompareArrows },
  { label: "Data workspaces", href: "/portal/workspace-map", icon: Database },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-surface-2">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border-default bg-white">
        <div className="flex h-16 items-center px-5">
          <Link href="/portal">
            <Logo size="sm" />
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {sidebarLinks.map((link) => {
            const isActive =
              pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));

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

        <div className="border-t border-border-subtle px-3 py-4">
          <FirebaseSignOutButton
            redirectTo="/login"
            variant="ghost"
            className="w-full justify-start px-3 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-3 hover:text-text-primary"
          />
        </div>
      </aside>

      <div className="flex-1 pl-60">
        <AppTopBanner
          homeHref="/portal"
          eyebrow="Legacy admin tools"
          items={sidebarLinks.map((link) => ({ label: link.label, href: link.href }))}
        >
          <FirebaseSignOutButton
            redirectTo="/login"
            variant="outline"
            className="rounded-full border-[#C9D2D8] bg-white px-4 text-[#102533] hover:bg-[#F5F8FA]"
          />
        </AppTopBanner>
        <main className="mx-auto max-w-6xl px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
