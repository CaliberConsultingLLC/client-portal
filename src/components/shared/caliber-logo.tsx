import Image from "next/image";
import { cn } from "@/lib/utils";

interface CaliberLogoProps {
  className?: string;
  size?: "sm" | "default" | "lg";
  showText?: boolean;
  variant?: "default" | "light";
}

const markSizes = {
  sm: 58,
  default: 72,
  lg: 96,
} as const;

export function CaliberLogo({
  className,
  size = "default",
  showText = true,
  variant = "default",
}: CaliberLogoProps) {
  const textColor = variant === "light" ? "text-white" : "text-[#2B2B2B]";
  const mutedColor = variant === "light" ? "text-[#D7B35A]" : "text-[#386B45]";
  const markSize = markSizes[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/CClogo3.png"
        alt="Caliber Consulting LLC logo"
        width={markSize}
        height={markSize}
        className="h-auto w-auto object-contain"
        priority={size !== "sm"}
      />
      {showText && (
        <div className="leading-none">
          <div className={cn("text-base font-medium tracking-[0.22em]", textColor)}>
            CALIBER CONSULTING LLC
          </div>
          <div className={cn("mt-1 text-[11px] font-normal uppercase tracking-[0.34em]", mutedColor)}>
            People & Culture Solutions
          </div>
        </div>
      )}
    </div>
  );
}
