import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Readout } from "@/types/readout";

interface ReadoutPublishModalProps {
  open: boolean;
  readout: Readout;
  clientName: string;
  onOpenChange: (open: boolean) => void;
  onPublish: () => Promise<void>;
}

export function ReadoutPublishModal({
  open,
  readout,
  clientName,
  onOpenChange,
  onPublish,
}: ReadoutPublishModalProps) {
  const introConfigured = Boolean(readout.intro.headline.trim() && readout.intro.body.trim());
  const outroConfigured = Boolean(readout.outro.headline.trim());
  const enabledFindings = readout.findings.filter((finding) => finding.enabled).length;
  const canPublish = introConfigured && outroConfigured && enabledFindings > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] rounded-[20px] border-[#D4DAD4]">
        <DialogHeader>
          <DialogTitle className="text-lg text-[#152238]">Publish this readout?</DialogTitle>
          <DialogDescription className="text-sm text-[#6E7E96]">
            {readout.name} - {clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl bg-[#F5F8F5] px-4 py-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6E7E96]">
              Pre-flight check
            </p>
            <div className="space-y-2 text-sm text-[#152238]">
              <p>{introConfigured ? "✓" : "○"} Intro configured (headline + body)</p>
              <p>{enabledFindings > 0 ? "✓" : "○"} {enabledFindings} finding(s) selected</p>
              <p>{outroConfigured ? "✓" : "○"} Outro configured (headline)</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#D4DAD4] px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8CC70] text-sm font-extrabold text-[#242424]">
              {(readout.intro.executiveName || "E").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#152238]">
                {readout.intro.executiveName || "Executive"}
              </p>
              <p className="text-xs text-[#6E7E96]">{readout.intro.executiveRole || "Role not set"}</p>
            </div>
          </div>

          <div className="rounded-lg border border-[#F0E2B6] bg-[#FFFDF5] px-4 py-3 text-sm text-[#7A5C0A]">
            <strong>Goes live immediately.</strong> This executive will see the readout in Insights as
            soon as you publish. You can update or unpublish later.
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-[#D4DAD4]"
            onClick={() => onOpenChange(false)}
          >
            Save as draft
          </Button>
          <Button
            type="button"
            className="rounded-full bg-[#386B45] text-white hover:bg-[#2E5738]"
            disabled={!canPublish}
            onClick={onPublish}
          >
            Publish now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
