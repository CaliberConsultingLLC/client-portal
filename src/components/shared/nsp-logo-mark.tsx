import { cn } from "@/lib/utils";
import Image from "next/image";

interface NspLogoMarkProps {
  className?: string;
  size?: number;
}

export function NspLogoMark({ className, size = 40 }: NspLogoMarkProps) {
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src="/logo.png"
        alt=""
        fill
        sizes={`${size}px`}
        className="object-cover object-[50%_8%] scale-[1.62]"
        priority={size >= 96}
      />
    </div>
  );
}
