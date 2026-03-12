import { cn } from "@/lib/utils";
import Image from "next/image";

interface NspLogoMarkProps {
  className?: string;
  size?: number;
}

export function NspLogoMark({ className, size = 40 }: NspLogoMarkProps) {
  const width = Math.max(18, Math.round(size * 0.58));
  const height = size;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width, height }}
      aria-hidden="true"
    >
      <Image
        src="/brand/forest-city-reference.png"
        alt=""
        fill
        sizes={`${width}px`}
        className="object-contain"
        priority={size >= 64}
      />
    </div>
  );
}
