import { cn } from "@/lib/utils";

interface NspLogoMarkProps {
  className?: string;
  size?: number;
}

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
      <g fill="#141214">
        <polygon points="50,2 43,39 50,43 57,39" />
        <polygon points="98,50 61,43 57,50 61,57" />
        <polygon points="50,98 57,61 50,57 43,61" />
        <polygon points="2,50 39,57 43,50 39,43" />

        <polygon points="79,13 56,36 58,42 64,40" />
        <polygon points="87,79 64,56 58,58 60,64" />
        <polygon points="21,87 44,64 42,58 36,60" />
        <polygon points="13,21 36,44 42,42 40,36" />
      </g>

      <path
        d="M45 68C43 59 43 52 46 45C49 37 55 33 60 32C56 35 53 39 53 45C53 53 57 58 63 64C57 69 50 72 45 68Z"
        fill="#009456"
      />
      <path
        d="M40 67C38 53 43 43 50 36C58 28 67 25 73 28C67 31 62 35 59 40C56 45 56 51 60 57C54 64 47 69 40 67Z"
        fill="#CFA44A"
      />
    </svg>
  );
}
