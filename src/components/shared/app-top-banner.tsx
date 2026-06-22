"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
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
      className={cn(
        "sticky top-0 z-50 border-b backdrop-blur-xl",
        isDark
          ? "border-[#363636] bg-[#242424]/98"
          : "border-border-subtle bg-white/92",
        className
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
                            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                            isDark
                              ? isActive
                                ? "border-[#D7B35A] bg-[#D7B35A] text-[#242424] shadow-[0_6px_18px_rgba(0,0,0,0.18)]"
                                : "border-white/10 bg-[#303030] text-white/84 hover:border-[#386B45]/70 hover:bg-[#386B45] hover:text-white"
                              : isActive
                                ? "border-[#2B2B2B] bg-[#2B2B2B] text-white"
                                : "border-transparent bg-[#F3F5F1] text-[#4E5E52] hover:border-[#D7B35A] hover:bg-white hover:text-[#2B2B2B]"
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
    </header>
  );
}
