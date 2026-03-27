import { cn } from "@/lib/utils";

interface CaliberLogoProps {
  className?: string;
  size?: "sm" | "default" | "lg";
  showText?: boolean;
  variant?: "default" | "light";
}

const markSizes = {
  sm: 40,
  default: 54,
  lg: 72,
} as const;

export function CaliberLogo({
  className,
  size = "default",
  showText = true,
  variant = "default",
}: CaliberLogoProps) {
  const textColor = variant === "light" ? "text-white" : "text-[#344954]";
  const mutedColor = variant === "light" ? "text-[#E8CC70]/85" : "text-[#5E7481]";
  const markSize = markSizes[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="relative shrink-0 rounded-full"
        style={{
          width: markSize,
          height: markSize,
          backgroundColor: "#344954",
          boxShadow: "inset 0 0 0 3px #E8CC70",
        }}
      >
        <div
          className="absolute inset-[18%] rounded-full"
          style={{ boxShadow: "inset 0 0 0 2px #E8CC70" }}
        />
        <div
          className="absolute left-1/2 top-[18%] h-[64%] w-px -translate-x-1/2"
          style={{ backgroundColor: "#E8CC70" }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center font-serif text-[42%] font-semibold tracking-[0.18em]"
          style={{ color: "#E8CC70" }}
        >
          CC
        </div>
      </div>
      {showText && (
        <div className="leading-none">
          <div className={cn("text-base font-semibold tracking-[0.22em]", textColor)}>
            CALIBER CONSULTING LLC
          </div>
          <div className={cn("mt-1 text-[11px] font-medium uppercase tracking-[0.34em]", mutedColor)}>
            People & Culture Solutions
          </div>
        </div>
      )}
    </div>
  );
}
