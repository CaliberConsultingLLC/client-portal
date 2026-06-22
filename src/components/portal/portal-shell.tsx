"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  PanelsTopLeft,
  FileText,
  NotebookPen,
  ClipboardList,
  Megaphone,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AppTopBanner } from "@/components/shared/app-top-banner";
import { FirebaseSignOutButton } from "@/components/auth/firebase-sign-out-button";
import { ViewAsToggle, type ViewAsUserOption } from "@/components/portal/view-as-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", href: "/portal", icon: LayoutDashboard, exact: true },
  { label: "Clients", href: "/portal/clients", icon: Building2 },
  { label: "Users", href: "/portal/users", icon: Users },
  { label: "Dashboards", href: "/portal/dashboards", icon: BarChart3 },
  { label: "Insights", href: "/portal/insights", icon: NotebookPen },
  { label: "Perspectives", href: "/portal/perspectives", icon: PanelsTopLeft },
  { label: "Reports", href: "/portal/reports", icon: FileText },
  { label: "Census", href: "/portal/census", icon: ClipboardList },
  { label: "Campaigns", href: "/portal/campaigns", icon: Megaphone },
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
  /** True when the super admin is currently previewing as another user. */
  isViewingAsUser?: boolean;
  /** The user uid currently being previewed, if any. */
  viewingAsUserUid?: string | null;
  /** All users the super admin can preview as. */
  viewAsUsers?: ViewAsUserOption[];
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
  isViewingAsUser = false,
  viewingAsUserUid = null,
  viewAsUsers = [],
  defaultDemoLabHref = "/portal/dashboards/lab/collaboration?demoLab=open",
}: PortalShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isInsightsEditing, setIsInsightsEditing] = useState(false);
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
  const canSeeInternalNav = isInternalUser && !isViewingAsUser;
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
  const isInsightsRoute = pathname.startsWith("/portal/insights");
  const insightsEditing = isInsightsRoute ? isInsightsEditing : false;

  useEffect(() => {
    if (!isInsightsRoute) {
      window.dispatchEvent(new CustomEvent("portal-readout-edit-mode", { detail: false }));
    }
  }, [isInsightsRoute]);

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
          {isViewingAsUser ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E8CC70]">
              User preview
            </p>
          ) : null}
        </div>
        {showViewAsToggle ? (
          <ViewAsToggle
            isViewingAsUser={isViewingAsUser}
            viewingAsUserUid={viewingAsUserUid}
            users={viewAsUsers}
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
        {isInternalUser && isInsightsRoute ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-[#D7B35A]/35 bg-white/8 px-4 text-white hover:bg-[#386B45]"
            onClick={() => {
              const next = !insightsEditing;
              setIsInsightsEditing(next);
              window.dispatchEvent(new CustomEvent("portal-readout-edit-mode", { detail: next }));
            }}
          >
            {insightsEditing ? "Done editing" : "Edit narrative"}
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
