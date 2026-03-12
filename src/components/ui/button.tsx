import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-[180ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nsp-green-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-nsp-green-500 text-white shadow-sm hover:bg-nsp-green-600 active:bg-nsp-green-700",
        secondary:
          "bg-nsp-orange-300 text-nsp-blue-900 shadow-sm hover:bg-nsp-orange-400 active:bg-nsp-orange-500",
        outline:
          "border border-border-default bg-white text-text-primary shadow-sm hover:bg-surface-3 active:bg-surface-4",
        ghost:
          "text-text-secondary hover:bg-surface-3 hover:text-text-primary",
        link: "text-nsp-orange-500 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 rounded-[--radius-md] px-3 text-sm",
        default: "h-11 rounded-[--radius-lg] px-5 text-sm",
        lg: "h-12 rounded-[--radius-lg] px-8 text-base",
        pill: "h-11 rounded-[--radius-pill] px-6 text-sm",
        icon: "h-10 w-10 rounded-[--radius-md]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
