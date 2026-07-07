import { cn } from "@/lib/utils";

interface PortalPageFrameProps {
  children: React.ReactNode;
  leftRail?: React.ReactNode;
  rightRail?: React.ReactNode;
  centerMaxWidthClassName?: string;
  className?: string;
  centerClassName?: string;
  /** Background of the center canvas column. Defaults to solid white. */
  centerBackgroundClassName?: string;
}

export function PortalPageFrame({
  children,
  leftRail,
  rightRail,
  centerMaxWidthClassName = "max-w-[1320px]",
  className,
  centerClassName,
  centerBackgroundClassName = "bg-white",
}: PortalPageFrameProps) {
  return (
    <div
      className={cn(
        "grid min-h-[calc(100vh-var(--app-top-banner-height))] grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_260px] xl:items-stretch",
        className
      )}
    >
      <aside
        className={cn(
          leftRail ? "block" : "hidden xl:block",
          "min-w-0 bg-[#E8ECE9] px-6 py-8 xl:self-stretch xl:border-r xl:border-[#D4DAD6]"
        )}
      >
        <div className="h-full min-h-full">
          {leftRail ?? <div aria-hidden="true" className="min-h-[1px]" />}
        </div>
      </aside>

      <div className={cn("min-w-0 px-6 py-8", centerBackgroundClassName)}>
        <div className={cn("mx-auto w-full", centerMaxWidthClassName, centerClassName)}>{children}</div>
      </div>

      <aside
        className={cn(
          rightRail ? "block" : "hidden xl:block",
          "min-w-0 bg-[#E8ECE9] px-6 py-8 xl:self-stretch xl:border-l xl:border-[#D4DAD6]"
        )}
      >
        <div className="h-full min-h-full">
          {rightRail ?? <div aria-hidden="true" className="min-h-[1px]" />}
        </div>
      </aside>
    </div>
  );
}
