"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm",
            "text-text-primary transition-colors",
            "focus:border-nsp-blue-500 focus:outline-none focus:ring-2 focus:ring-nsp-blue-500/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-nsp-red-500 focus:border-nsp-red-500 focus:ring-nsp-red-500/20",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="text-xs text-nsp-red-500">{error}</p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
