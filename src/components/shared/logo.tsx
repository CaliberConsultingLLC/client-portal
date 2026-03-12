import { cn } from "@/lib/utils";
import { NspLogoMark } from "./nsp-logo-mark";

interface LogoProps {
  className?: string;
  size?: "sm" | "default" | "lg";
  showText?: boolean;
  /** Use light text (for dark backgrounds) */
  variant?: "default" | "light";
}

export function Logo({
  className,
  size = "default",
  showText = true,
  variant = "default",
}: LogoProps) {
  const markSize = { sm: 40, default: 52, lg: 72 }[size];

  const nameSize = {
    sm: "text-[14px]",
    default: "text-lg",
    lg: "text-xl",
  }[size];

  const tagSize = {
    sm: "text-[9px]",
    default: "text-[10px]",
    lg: "text-xs",
  }[size];

  const textColor =
    variant === "light" ? "text-white" : "text-text-primary";
  const mutedColor =
    variant === "light" ? "text-nsp-orange-100/80" : "text-text-muted";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <NspLogoMark size={markSize} />
      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "font-serif font-bold tracking-tight",
              nameSize,
              textColor
            )}
          >
            North Star Partners
          </span>
          <span
            className={cn(
              "mt-0.5 font-sans font-semibold uppercase tracking-[0.2em]",
              tagSize,
              mutedColor
            )}
          >
            Est 2025
          </span>
        </div>
      )}
    </div>
  );
}
