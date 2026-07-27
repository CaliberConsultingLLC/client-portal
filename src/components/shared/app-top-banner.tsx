"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { CaliberLogo } from "@/components/shared/caliber-logo";
import { Logo } from "@/components/shared/logo";

interface AppTopBannerItem {
  label: string;
  href: string;
  exact?: boolean;
}

interface AppTopBannerProps {
  brand?: "northstar" | "caliber";
  eyebrow?: string;
  homeHref?: string;
  items?: AppTopBannerItem[];
  children?: React.ReactNode;
  className?: string;
  inlineChildren?: boolean;
  tone?: "light" | "dark";
}

function isItemActive(pathname: string, item: AppTopBannerItem) {
  if (item.exact) {
    return pathname === item.href;
  }

  if (item.href === "/") {
    return pathname === "/";
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AppTopBanner({
  brand = "northstar",
  eyebrow,
  homeHref = "/",
  items = [],
  children,
  className,
  inlineChildren = false,
  tone = "light",
}: AppTopBannerProps) {
  const pathname = usePathname();
  const isDark = tone === "dark";
  const headerRef = useRef<HTMLElement>(null);
  // Click-to-toggle collapse: defaults to expanded (current look, unchanged
  // behavior). Collapsing hides the nav content and leaves only the
  // divider/border as a thin anchor at the top of the viewport. Hovering
  // near the top only reveals the toggle button — it never auto-collapses
  // or auto-expands on its own.
  const [collapsed, setCollapsed] = useState(false);
  const [revealToggle, setRevealToggle] = useState(false);

  useEffect(() => {
    const headerElement = headerRef.current;
    if (!headerElement) {
      return;
    }

    const updateHeaderHeight = () => {
      document.documentElement.style.setProperty(
        "--app-top-banner-height",
        `${headerElement.getBoundingClientRect().height}px`
      );
    };

    updateHeaderHeight();

    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    resizeObserver.observe(headerElement);
    window.addEventListener("resize", updateHeaderHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateHeaderHeight);
    };
  }, []);

  return (
    <header
      ref={headerRef}
      onMouseEnter={() => setRevealToggle(true)}
      onMouseLeave={() => setRevealToggle(false)}
      className={cn(
        "sticky top-0 z-50 backdrop-blur-xl relative",
        isDark
          ? "bg-[#242424]/98"
          : "border-b border-border-subtle bg-white/92",
        className
      )}
    >
      {/* Once collapsed the header itself shrinks down to just its
          divider/border, so this invisible strip widens the hover-proximity
          zone (roughly the top 20px of the viewport) enough that the toggle
          button can still be found and revealed. */}
      {collapsed ? (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-5"
          onMouseEnter={() => setRevealToggle(true)}
        />
      ) : null}

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: collapsed ? "0fr" : "1fr" }}
      >
        <div
          className={cn(
            // Only clip while collapsing. When expanded, overflow must stay
            // visible so header menus (e.g. View as) can render below the bar.
            "transition-opacity duration-150 ease-out",
            collapsed ? "overflow-hidden opacity-0" : "overflow-visible opacity-100"
          )}
        >
          <div
            className={cn(
              "flex w-full items-center gap-4 px-4 py-3 sm:px-6",
              inlineChildren ? "justify-start" : "justify-between"
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <Link href={homeHref} className="shrink-0">
                {brand === "caliber" ? (
                  <CaliberLogo size="sm" variant={isDark ? "light" : "default"} />
                ) : (
                  <Logo size="sm" variant={isDark ? "light" : "default"} />
                )}
              </Link>

              {(eyebrow || items.length > 0) && (
                <>
                  <div
                    className={cn(
                      "hidden h-8 w-px lg:block",
                      isDark ? "bg-white/16" : "bg-border-subtle"
                    )}
                  />
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {eyebrow ? (
                      <p
                        className={cn(
                          "hidden shrink-0 text-[11px] font-semibold uppercase tracking-[0.24em] xl:block",
                          isDark ? "text-white/68" : "text-text-muted"
                        )}
                      >
                        {eyebrow}
                      </p>
                    ) : null}
                    {items.length > 0 ? (
                      <nav className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap">
                        {items.map((item) => {
                          const isActive = isItemActive(pathname, item);

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={cn(
                                "rounded-xl border px-3.5 py-2 text-[13px] font-medium transition-colors",
                                isDark
                                  ? isActive
                                    ? "border-[#D7B35A] bg-[#D7B35A] text-[#242424] shadow-[0_6px_18px_rgba(0,0,0,0.18)]"
                                    : "border-transparent bg-transparent text-white/84 hover:border-[#386B45] hover:bg-[#386B45] hover:text-white"
                                  : isActive
                                    ? "border-[#2B2B2B] bg-[#2B2B2B] text-white"
                                    : "border-transparent bg-transparent text-[#4E5E52] hover:border-[#D7B35A] hover:bg-white hover:text-[#2B2B2B]"
                              )}
                            >
                              {item.label}
                            </Link>
                          );
                        })}
                      </nav>
                    ) : null}
                  </div>
                </>
              )}
            </div>

            {children ? (
              <div
                className={cn(
                  "flex shrink-0 items-center gap-3",
                  inlineChildren ? "ml-4" : ""
                )}
              >
                {children}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Two-part divider instead of a single hairline: a thin white gap
          reading as breathing room, then a bar matching the nav's own dark
          background, so the transition to the (light) page below reads as
          a deliberate section break rather than one flat line-to-line cut. */}
      {isDark ? (
        <div aria-hidden="true" className="flex flex-col">
          <div className="h-[1.5px] bg-white" />
          <div className="h-[4px] bg-[#242424]" />
        </div>
      ) : null}

      {/* Collapse/expand toggle: invisible at rest, fades in only when the
          mouse is near the top of the viewport. Clicking is the only way to
          change state — hovering never auto-collapses or auto-expands.
          Solid fill + ring + shadow (not a faint translucent tint) so it
          reads as a clear, distinct control the instant it appears, and a
          z-index above the banner itself (z-50) so it's never layered
          underneath sticky content immediately below the nav. */}
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        aria-label={collapsed ? "Expand navigation bar" : "Collapse navigation bar"}
        aria-expanded={!collapsed}
        className={cn(
          "absolute left-1/2 top-full z-[60] flex h-7 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.28)] ring-1 transition-all duration-150 ease-out",
          isDark
            ? "bg-white text-[#242424] ring-black/10 hover:bg-[#D7B35A]"
            : "bg-[#242424] text-white ring-black/10 hover:bg-[#386B45]",
          revealToggle ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0"
        )}
      >
        {collapsed ? (
          <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
        ) : (
          <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
        )}
      </button>
    </header>
  );
}
