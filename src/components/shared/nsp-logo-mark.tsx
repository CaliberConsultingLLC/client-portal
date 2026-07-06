import { cn } from "@/lib/utils";
import Image from "next/image";

interface NspLogoMarkProps {
  className?: string;
  size?: number;
  variant?: "default" | "light";
}

export function NspLogoMark({ className, size = 40, variant = "default" }: NspLogoMarkProps) {
  return (
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src={variant === "light" ? "/NSlogo4white.png" : "/NSLogoClean.png"}
        alt=""
        fill
        sizes={`${size}px`}
        className="object-contain"
        priority={size >= 96}
      />
    </div>
  );
}
