import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accentColor?: string;
  className?: string;
}

export function ServiceCard({
  icon: Icon,
  title,
  description,
  accentColor = "nsp-blue",
  className,
}: ServiceCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-[--radius-lg] border border-border-default bg-white p-6 shadow-sm transition-all duration-300 hover:border-border-strong hover:shadow-md",
        className
      )}
    >
      <div
        className={cn(
          "mb-4 flex h-11 w-11 items-center justify-center rounded-[--radius-md] transition-colors duration-300",
          `bg-${accentColor}-50 text-${accentColor}-500 group-hover:bg-${accentColor}-100`
        )}
        style={{
          backgroundColor: `var(--color-${accentColor}-50)`,
          color: `var(--color-${accentColor}-500)`,
        }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mb-2 text-base font-bold text-text-primary">{title}</h3>
      <p className="text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}
