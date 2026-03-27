import { FileText, FolderOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortalAssetsByType } from "@/lib/portal/workspace";

export default function PortalDocumentsPage() {
  const documentAssets = getPortalAssetsByType("document");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">Documents</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#102533]">
          Downloadable files and supporting materials
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
          This area is intended for decks, summaries, working files, and any other client-facing
          materials that should be available alongside your dashboards.
        </p>
      </div>

      <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
        <CardHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF3F6] text-[#18384E]">
            <FolderOpen className="h-5 w-5" />
          </div>
          <CardTitle className="pt-4 text-xl text-[#102533]">Document library</CardTitle>
          <CardDescription className="text-[#60727D]">
            Files added to the client portal will appear here once connected.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {documentAssets.map((asset) => (
            <div key={asset.id} className="rounded-2xl bg-[#F5F8FA] px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#18384E]">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#102533]">{asset.title}</p>
                  <p className="text-sm text-[#60727D]">{asset.updatedLabel || "Portal placeholder"}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
