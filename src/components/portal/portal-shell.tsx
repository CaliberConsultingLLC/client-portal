"use client";

import { Suspense, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  PanelsTopLeft,
  NotebookPen,
  ClipboardList,
  Megaphone,
  MapPin,
  BookText,
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
  { label: "Readouts", href: "/portal/readouts", icon: BookText },
  { label: "Workspace Map", href: "/portal/workspace-map", icon: MapPin },
  // Perspectives and Live Fielding temporarily hidden to reduce nav overflow
  // { label: "Perspectives", href: "/portal/perspectives", icon: PanelsTopLeft },
  { label: "Census", href: "/portal/census", icon: ClipboardList },
  // { label: "Live Fielding", href: "/portal/campaigns", icon: Megaphone },
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

const DEMO_LAB_DISABLED_ASSET_IDS = new Set([
  "employee-experience", // CSG production dashboard should never expose demo lab controls.
]);

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

interface DemoLabButtonProps {
  pathname: string;
  isDashboardLabRoute: boolean;
  isDashboardRoute: boolean;
  currentDashboardDemoLabHref: string | null;
  defaultDemoLabHref: string;
  showDemoLabButton: boolean;
}

function DemoLabButton({
  pathname,
  isDashboardLabRoute,
  isDashboardRoute,
  currentDashboardDemoLabHref,
  defaultDemoLabHref,
  showDemoLabButton,
}: DemoLabButtonProps) {
  const searchParams = useSearchParams();
  const isDemoLabOpen = searchParams.get("demoLab") === "open";
  const demoLabHref =
    isDashboardLabRoute && isDemoLabOpen
      ? pathname
      : currentDashboardDemoLabHref
        ? currentDashboardDemoLabHref
        : isDashboardRoute && isDemoLabOpen
          ? `${pathname}?${new URLSearchParams({ demoLab: "open" }).toString()}`
          : defaultDemoLabHref;

  if (!showDemoLabButton) {
    return null;
  }

  return (
    <Button
      asChild
      variant="outline"
      className="rounded-full border-[#D7B35A]/35 bg-white/8 px-4 text-white hover:bg-[#386B45]"
    >
      <Link href={demoLabHref}>{isDemoLabOpen ? "Hide Demo Lab" : "Open Demo Lab"}</Link>
    </Button>
  );
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
  const [isInsightsEditing, setIsInsightsEditing] = useState(false);
  // Internal-only top-nav. Clients reach their census through the campaign
  // card's "Census" button instead of a global Census tab.
  const internalOnlyNav = new Set([
    "/portal/clients",
    "/portal/readouts",
    "/portal/workspace-map",
    "/portal/perspectives",
    "/portal/documents",
    "/portal/resources",
    "/portal/census",
  ]);
  const canSeeInternalNav = isInternalUser && !isViewingAsUser;
  const visibleNavItems = navItems.filter((item) => {
    if (internalOnlyNav.has(item.href)) {
      return canSeeInternalNav;
    }

    // Home, Users, Dashboards, and Live Fielding are visible to everyone.
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
  const showDemoLabButton =
    isDashboardRoute &&
    !DEMO_LAB_DISABLED_ASSET_IDS.has(normalizeDashboardAssetId(currentDashboardAssetId)) &&
    (isInternalUser || isDemoDashboardRoute || hasDemoWorkspaceAccess);
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
        <Suspense fallback={null}>
          <DemoLabButton
            pathname={pathname}
            isDashboardLabRoute={isDashboardLabRoute}
            isDashboardRoute={isDashboardRoute}
            currentDashboardDemoLabHref={currentDashboardDemoLabHref}
            defaultDemoLabHref={defaultDemoLabHref}
            showDemoLabButton={showDemoLabButton}
          />
        </Suspense>
        <FirebaseSignOutButton
          redirectTo="/login"
          variant="outline"
          className="rounded-full border-[#D7B35A]/35 bg-white/8 px-4 text-white hover:bg-[#386B45]"
        />
        <div className="flex flex-col items-end gap-1">
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
        </div>
      </AppTopBanner>

      <main
        className={cn(
          "relative mx-auto w-full",
          isDashboardRoute
            ? "px-0 pb-8"
            : "min-h-[calc(100vh-var(--app-top-banner-height))] bg-[#E8ECE9]"
        )}
      >
        {isInternalUser && isInsightsRoute ? (
          <div className="pointer-events-none absolute right-6 top-4 z-30">
            <Button
              type="button"
              variant="outline"
              className="pointer-events-auto rounded-full border-[#8798AA] bg-white px-4 text-[#152238] hover:bg-[#F5F8FA]"
              onClick={() => {
                const next = !insightsEditing;
                setIsInsightsEditing(next);
                window.dispatchEvent(new CustomEvent("portal-readout-edit-mode", { detail: next }));
              }}
            >
              {insightsEditing ? "Done editing" : "Edit narrative"}
            </Button>
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
