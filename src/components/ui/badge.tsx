import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-nsp-blue-100 text-nsp-blue-700",
        secondary: "bg-surface-3 text-text-secondary",
        success: "bg-nsp-green-100 text-nsp-green-500",
        warning: "bg-nsp-yellow-100 text-nsp-yellow-400",
        destructive: "bg-nsp-red-100 text-nsp-red-400",
        outline: "border border-border-default text-text-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
