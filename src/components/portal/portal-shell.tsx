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
import { ViewAsToggle, type ViewAsClientOption } from "@/components/portal/view-as-toggle";
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
  /** True when the real signed-in user is the super admin (controls the View-as toggle). */
  showViewAsToggle?: boolean;
  /** True when the super admin is currently previewing the portal as a client. */
  isViewingAsClient?: boolean;
  /** The clientId currently being previewed, if any. */
  viewingAsClientId?: string | null;
  /** All clients the super admin can preview as. */
  viewAsClients?: ViewAsClientOption[];
  defaultDemoLabHref?: string;
}

function normalizeDashboardAssetId(assetId: string) {
  return assetId.split("--")[0] ?? assetId;
}

function getDemoLabHrefForAsset(assetId: string) {
  switch (normalizeDashboardAssetId(assetId)) {
    case "collaboration-dashboard":
      return "/portal/dashboards/lab/collaboration?demoLab=open";
    case "integration-dashboard":
    case "csg-integration-dashboard":
      return "/portal/dashboards/lab/integration-effectiveness?demoLab=open";
    case "dws-employee-experience":
      return "/portal/dashboards/lab/employee-experience?demoLab=open";
    default:
      return null;
  }
}

export function PortalShell({
  children,
  userName,
  isInternalUser = false,
  demoDashboardAssetIds = [],
  hasDemoWorkspaceAccess = false,
  showViewAsToggle = false,
  isViewingAsClient = false,
  viewingAsClientId = null,
  viewAsClients = [],
  defaultDemoLabHref = "/portal/dashboards/lab/collaboration?demoLab=open",
}: PortalShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Internal-only top-nav. Clients reach their census through the campaign
  // card's "Census" button instead of a global Census tab.
  const internalOnlyNav = new Set([
    "/portal/clients",
    "/portal/perspectives",
    "/portal/reports",
    "/portal/documents",
    "/portal/resources",
    "/portal/census",
  ]);
  const canSeeInternalNav = isInternalUser && !isViewingAsClient;
  const visibleNavItems = navItems.filter((item) => {
    if (internalOnlyNav.has(item.href)) {
      return canSeeInternalNav;
    }

    // Home, Users, Dashboards, and Campaigns are visible to everyone.
    return true;
  });
  const dashboardPathParts = pathname.split("/").filter(Boolean);
  const isDashboardLabRoute =
    dashboardPathParts.length === 4 &&
    dashboardPathParts[0] === "portal" &&
    dashboardPathParts[1] === "dashboards" &&
    dashboardPathParts[2] === "lab";
  const isDashboardRoute =
    (dashboardPathParts.length === 3 &&
      dashboardPathParts[0] === "portal" &&
      dashboardPathParts[1] === "dashboards") ||
    isDashboardLabRoute;
  const currentDashboardAssetId = isDashboardRoute && !isDashboardLabRoute ? dashboardPathParts[2] ?? "" : "";
  const currentDashboardDemoLabHref = currentDashboardAssetId
    ? getDemoLabHrefForAsset(currentDashboardAssetId)
    : null;
  const isDemoDashboardRoute = demoDashboardAssetIds.includes(currentDashboardAssetId);
  const isDemoLabOpen = searchParams.get("demoLab") === "open";
  const demoLabHref =
    isDashboardLabRoute && isDemoLabOpen
      ? pathname
      : currentDashboardDemoLabHref
        ? currentDashboardDemoLabHref
        : isDashboardRoute && isDemoLabOpen
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
          {isViewingAsClient ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E8CC70]">
              Client preview
            </p>
          ) : null}
        </div>
        {showViewAsToggle ? (
          <ViewAsToggle
            isViewingAsClient={isViewingAsClient}
            viewingAsClientId={viewingAsClientId}
            clients={viewAsClients}
          />
        ) : null}
        {showDemoLabButton ? (
          <Button
            asChild
            variant="outline"
            className="rounded-full border-[#D7B35A]/35 bg-white/8 px-4 text-white hover:bg-[#386B45]"
          >
            <Link href={demoLabHref}>
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
