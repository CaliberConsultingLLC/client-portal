import type { CampaignStatus } from "@/types/campaign";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: "border-[#D6DEE3] bg-[#F5F8FA] text-[#60727D]",
  configured: "border-[#D7B35A]/35 bg-[#FFF8DF] text-[#6F5414]",
  launched: "border-[#B7D9C0] bg-[#EFF8F1] text-[#386B45]",
  active: "border-[#B7D9C0] bg-[#EFF8F1] text-[#386B45]",
  paused: "border-[#D6DEE3] bg-[#F5F8FA] text-[#60727D]",
  closing: "border-[#D7B35A]/35 bg-[#FFF8DF] text-[#6F5414]",
  closed: "border-[#D6DEE3] bg-white text-[#60727D]",
};

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
  className?: string;
}

export function CampaignStatusBadge({ status, className }: CampaignStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
        STATUS_STYLES[status],
        className
      )}
    >
      {status}
    </span>
  );
}
