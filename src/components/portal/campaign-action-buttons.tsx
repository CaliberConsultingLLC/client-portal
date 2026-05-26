"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CampaignStatus } from "@/types/campaign";

interface CampaignActionButtonsProps {
  status: CampaignStatus;
}

export function CampaignActionButtons({ status }: CampaignActionButtonsProps) {
  const [message, setMessage] = useState("");

  function showPhase4Message(action: string) {
    setMessage(`${action} is wired in Phase 4. No automation ran from this placeholder.`);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap justify-end gap-2">
        {status === "configured" ? (
          <Button
            type="button"
            className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]"
            onClick={() => showPhase4Message("Launch Campaign")}
          >
            Launch Campaign
          </Button>
        ) : null}
        {status === "active" || status === "paused" ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-[#C9D2D8]"
            onClick={() => showPhase4Message("Sync Responses")}
          >
            Sync Responses
          </Button>
        ) : null}
        {status === "active" ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-[#C9D2D8]"
            onClick={() => showPhase4Message("Send Reminder")}
          >
            Send Reminder
          </Button>
        ) : null}
        {status === "active" ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-[#C9D2D8]"
            onClick={() => showPhase4Message("Pause")}
          >
            Pause
          </Button>
        ) : null}
        {status === "paused" ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-[#C9D2D8]"
            onClick={() => showPhase4Message("Resume")}
          >
            Resume
          </Button>
        ) : null}
        {status === "active" || status === "paused" ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-[#C9D2D8]"
            onClick={() => showPhase4Message("Close Campaign")}
          >
            Close
          </Button>
        ) : null}
      </div>
      {message ? <p className="text-right text-sm text-[#60727D]">{message}</p> : null}
    </div>
  );
}
