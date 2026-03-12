import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }
>(({ className, type, label, error, id, ...props }, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-text-primary"
        >
          {label}
        </label>
      )}
      <input
        type={type}
        id={inputId}
        className={cn(
          "flex h-11 w-full rounded-[--radius-md] border border-border-default bg-white px-4 py-2 text-sm text-text-primary shadow-sm transition-colors duration-[180ms] placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nsp-green-400 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-nsp-red-300 focus-visible:ring-nsp-red-300",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && <p className="text-xs text-nsp-red-400">{error}</p>}
    </div>
  );
});
Input.displayName = "Input";

export { Input };
