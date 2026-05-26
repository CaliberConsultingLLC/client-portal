"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { CampaignStatus } from "@/types/campaign";

interface CampaignActionButtonsProps {
  campaignId: string;
  status: CampaignStatus;
}

export function CampaignActionButtons({ campaignId, status }: CampaignActionButtonsProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<"email" | "text" | "all">("all");
  const [runningAction, setRunningAction] = useState("");

  async function runAction(action: string) {
    setRunningAction(action);
    setMessage("");

    try {
      const response = await fetch(`/api/portal/campaigns/${campaignId}/actions/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "reminder" ? { channel } : {}),
      });
      const payload = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to run campaign action.");
      }

      setMessage(`${action} completed. Activity log updated.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to run campaign action.");
    } finally {
      setRunningAction("");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap justify-end gap-2">
        {status === "configured" ? (
          <Button
            type="button"
            className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]"
            disabled={Boolean(runningAction)}
            onClick={() => runAction("launch")}
          >
            {runningAction === "launch" ? "Launching..." : "Launch Campaign"}
          </Button>
        ) : null}
        {status === "active" || status === "paused" ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-[#C9D2D8]"
            disabled={Boolean(runningAction)}
            onClick={() => runAction("sync")}
          >
            {runningAction === "sync" ? "Syncing..." : "Sync Responses"}
          </Button>
        ) : null}
        {status === "active" ? (
          <>
            <Select
              aria-label="Reminder channel"
              value={channel}
              onChange={(event) => setChannel(event.target.value as "email" | "text" | "all")}
              className="h-10 rounded-full"
            >
              <option value="all">All channels</option>
              <option value="email">Email</option>
              <option value="text">Text</option>
            </Select>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-[#C9D2D8]"
              disabled={Boolean(runningAction)}
              onClick={() => runAction("reminder")}
            >
              {runningAction === "reminder" ? "Sending..." : "Send Reminder"}
            </Button>
          </>
        ) : null}
        {status === "active" ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-[#C9D2D8]"
            disabled={Boolean(runningAction)}
            onClick={() => runAction("pause")}
          >
            {runningAction === "pause" ? "Pausing..." : "Pause"}
          </Button>
        ) : null}
        {status === "paused" ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-[#C9D2D8]"
            disabled={Boolean(runningAction)}
            onClick={() => runAction("resume")}
          >
            {runningAction === "resume" ? "Resuming..." : "Resume"}
          </Button>
        ) : null}
        {status === "active" || status === "paused" ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-[#C9D2D8]"
            disabled={Boolean(runningAction)}
            onClick={() => runAction("close")}
          >
            {runningAction === "close" ? "Closing..." : "Close"}
          </Button>
        ) : null}
      </div>
      {message ? <p className="text-right text-sm text-[#60727D]">{message}</p> : null}
    </div>
  );
}
