import { cn } from "@/lib/utils";

interface NspLogoMarkProps {
  className?: string;
  size?: number;
}

/**
 * North Star Partners logo mark — 8-point compass star with intertwined
 * blue / orange flame ribbon in the center.  Pure SVG, no external file needed.
 */
export function NspLogoMark({ className, size = 40 }: NspLogoMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {/* 8-point compass star */}
      <g fill="#1a1a1a">
        {/* Cardinal points (N, E, S, W) — tall narrow diamonds */}
        <polygon points="50,2 44,38 50,42 56,38" />  {/* North */}
        <polygon points="98,50 62,44 58,50 62,56" />  {/* East */}
        <polygon points="50,98 56,62 50,58 44,62" />  {/* South */}
        <polygon points="2,50 38,56 42,50 38,44" />   {/* West */}

        {/* Intercardinal points (NE, SE, SW, NW) — shorter, thinner */}
        <polygon points="79,13 56,36 58,42 64,40" />  {/* NE */}
        <polygon points="87,79 64,56 58,58 60,64" />  {/* SE */}
        <polygon points="21,87 44,64 42,58 36,60" />  {/* SW */}
        <polygon points="13,21 36,44 42,42 40,36" />  {/* NW */}
      </g>

      {/* Center circle background */}
      <circle cx="50" cy="50" r="14" fill="#f8f7f5" />

      {/* Intertwined flame / ribbon — blue strand */}
      <path
        d="M46,62 C44,56 42,50 44,44 C46,38 50,36 50,36 C50,36 46,42 48,48 C50,54 50,56 46,62Z"
        fill="#3F647B"
        opacity="0.9"
      />
      {/* Intertwined flame / ribbon — orange strand */}
      <path
        d="M54,62 C56,56 58,50 56,44 C54,38 50,36 50,36 C50,36 54,42 52,48 C50,54 50,56 54,62Z"
        fill="#E07A3F"
        opacity="0.9"
      />

      {/* Small center highlight */}
      <circle cx="50" cy="48" r="2.5" fill="#f8f7f5" opacity="0.6" />
    </svg>
  );
}
