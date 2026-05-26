"use client";

import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  PanelsTopLeft,
  FileText,
  FolderOpen,
  LifeBuoy,
  ClipboardList,
  Megaphone,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AppTopBanner } from "@/components/shared/app-top-banner";
import { FirebaseSignOutButton } from "@/components/auth/firebase-sign-out-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", href: "/portal", icon: LayoutDashboard, exact: true },
  { label: "Clients", href: "/portal/clients", icon: Building2 },
  { label: "Users", href: "/portal/users", icon: Users },
  { label: "Dashboards", href: "/portal/dashboards", icon: BarChart3 },
  { label: "Perspectives", href: "/portal/perspectives", icon: PanelsTopLeft },
  { label: "Reports", href: "/portal/reports", icon: FileText },
  { label: "Census", href: "/portal/census", icon: ClipboardList },
  { label: "Campaigns", href: "/portal/campaigns", icon: Megaphone },
  { label: "Documents", href: "/portal/documents", icon: FolderOpen },
  { label: "Resources", href: "/portal/resources", icon: LifeBuoy },
];

interface PortalShellProps {
  children: React.ReactNode;
  userName?: string | null;
  isInternalUser?: boolean;
  demoDashboardAssetIds?: string[];
  hasDemoWorkspaceAccess?: boolean;
  canManageCensus?: boolean;
  defaultDemoLabHref?: string;
}

function normalizeDashboardAssetId(assetId: string) {
  return assetId.split("--")[0] ?? assetId;
}

export function PortalShell({
  children,
  userName,
  isInternalUser = false,
  demoDashboardAssetIds = [],
  hasDemoWorkspaceAccess = false,
  canManageCensus = false,
  defaultDemoLabHref = "/portal/dashboards/collaboration-dashboard?demoLab=open",
}: PortalShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visibleNavItems = navItems.filter((item) => {
    if (
      item.href === "/portal/clients" ||
      item.href === "/portal/users" ||
      item.href === "/portal/perspectives"
    ) {
      return isInternalUser;
    }

    if (item.href === "/portal/census") {
      return canManageCensus;
    }

    return true;
  });
  const dashboardPathParts = pathname.split("/").filter(Boolean);
  const isDashboardRoute =
    dashboardPathParts.length === 3 &&
    dashboardPathParts[0] === "portal" &&
    dashboardPathParts[1] === "dashboards";
  const currentDashboardAssetId = isDashboardRoute ? dashboardPathParts[2] ?? "" : "";
  const isCollaborationDashboardRoute =
    isDashboardRoute && normalizeDashboardAssetId(currentDashboardAssetId) === "collaboration-dashboard";
  const isDemoDashboardRoute = demoDashboardAssetIds.includes(currentDashboardAssetId);
  const isDemoLabOpen = searchParams.get("demoLab") === "open";
  const collaborationDashboardHref =
    isCollaborationDashboardRoute && isDemoLabOpen
      ? pathname
      : isCollaborationDashboardRoute
        ? `${pathname}?${new URLSearchParams({ demoLab: "open" }).toString()}`
        : defaultDemoLabHref;
  const showDemoLabButton =
    isDashboardRoute && (isInternalUser || isDemoDashboardRoute || hasDemoWorkspaceAccess);

  return (
    <div className="min-h-screen bg-[#EEF2EE]">
      <AppTopBanner
        brand="caliber"
        homeHref="/portal"
        tone="dark"
        items={visibleNavItems.map((item) => ({
          label: item.label,
          href: item.href,
          exact: item.exact,
        }))}
      >
        <div className="text-right">
          <p className="text-sm font-semibold text-white">{userName || "Portal User"}</p>
        </div>
        {showDemoLabButton ? (
          <Button
            asChild
            variant="outline"
            className="rounded-full border-[#D7B35A]/35 bg-white/8 px-4 text-white hover:bg-[#386B45]"
          >
            <Link href={collaborationDashboardHref}>
              {isDemoLabOpen ? "Hide Demo Lab" : "Open Demo Lab"}
            </Link>
          </Button>
        ) : null}
        <FirebaseSignOutButton
          redirectTo="/login"
          variant="outline"
          className="rounded-full border-[#D7B35A]/35 bg-white/8 px-4 text-white hover:bg-[#386B45]"
        />
      </AppTopBanner>

      <main
        className={cn(
          "mx-auto w-full",
          isDashboardRoute
            ? "px-0 pb-8"
            : "min-h-[calc(100vh-var(--app-top-banner-height))] bg-[#E8ECE9]"
        )}
      >
        {children}
      </main>
    </div>
  );
}
