import { cn } from "@/lib/utils";
import { Compass } from "lucide-react";

interface LogoProps {
  className?: string;
  size?: "sm" | "default" | "lg";
  showText?: boolean;
}

export function Logo({ className, size = "default", showText = true }: LogoProps) {
  const iconSize = {
    sm: "h-6 w-6",
    default: "h-8 w-8",
    lg: "h-10 w-10",
  }[size];

  const textSize = {
    sm: "text-base",
    default: "text-lg",
    lg: "text-xl",
  }[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex items-center justify-center rounded-[--radius-md] bg-nsp-blue-500 p-1.5 text-white">
        <Compass className={iconSize} strokeWidth={2.5} />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span
            className={cn(
              "font-extrabold leading-tight tracking-tight text-text-primary",
              textSize
            )}
          >
            North Star
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Partners
          </span>
        </div>
      )}
    </div>
  );
}
