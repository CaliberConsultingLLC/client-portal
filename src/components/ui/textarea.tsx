import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "flex min-h-[80px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm",
            "text-text-primary placeholder:text-text-muted transition-colors",
            "focus:border-nsp-blue-500 focus:outline-none focus:ring-2 focus:ring-nsp-blue-500/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-nsp-red-500 focus:border-nsp-red-500 focus:ring-nsp-red-500/20",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-nsp-red-500">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
