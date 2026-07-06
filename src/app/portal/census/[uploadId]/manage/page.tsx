import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Table2 } from "lucide-react";
import { PortalContentFrame } from "@/components/portal/portal-content-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import {
  getCensusUploadById,
  listCensusUploadsForSurvey,
} from "@/lib/firebase/census-store";
import { getAccessiblePortalClients } from "@/lib/firebase/portal-access";

interface CensusManagePageProps {
  params: Promise<{
    uploadId: string;
  }>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function CensusManagePage({ params }: CensusManagePageProps) {
  const { uploadId } = await params;
  const user = await requireFirebasePortalUser();
  const canManageCensus = isInternalFirebaseRole(user.role) || user.role === "client_admin";

  if (!canManageCensus) {
    notFound();
  }

  const [clients, upload] = await Promise.all([
    getAccessiblePortalClients(user),
    getCensusUploadById(uploadId),
  ]);

  if (!upload || !clients.some((client) => client.id === upload.clientId)) {
    notFound();
  }

  const history = await listCensusUploadsForSurvey(upload.clientId, upload.surveyId);
  const client = clients.find((entry) => entry.id === upload.clientId);

  return (
    <PortalContentFrame>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">
              Manage Census
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2B2B2B]">
              {upload.surveyLabel}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
              {client?.name ?? upload.clientId} · {upload.surveyId} · {upload.dashboardTitle ?? "Dashboard not linked"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-full bg-[#2B2B2B] text-white hover:bg-[#386B45]">
              <Link href={`/portal/census/${upload.id}`}>
                <Table2 className="h-4 w-4" />
                Census Table
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
              <Link href="/portal/census">
                <ArrowLeft className="h-4 w-4" />
                Back to census
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-[#2B2B2B]">Census Details</CardTitle>
              <CardDescription className="text-[#60727D]">
                Metadata for this survey-specific census upload.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Client", client?.name ?? upload.clientId],
                ["Survey ID", upload.surveyId],
                ["Survey Label", upload.surveyLabel],
                ["Dashboard", upload.dashboardTitle ?? upload.dashboardAssetId ?? "Not linked"],
                ["Employee ID Column", upload.employeeIdColumn],
                ["Department Column", upload.departmentColumn ?? "Not detected"],
                ["Rows", upload.rowCount.toLocaleString()],
                ["Updated", formatDate(upload.updatedAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-[#F5F8FA] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#60727D]">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#2B2B2B]">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-[#2B2B2B]">Survey Upload History</CardTitle>
              <CardDescription className="text-[#60727D]">
                Previous census files for this same client and survey ID.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-[#D6DEE3] px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#2B2B2B]">{entry.fileName}</p>
                      <p className="mt-1 text-sm text-[#60727D]">
                        {entry.rowCount.toLocaleString()} employees · {formatDate(entry.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.id === upload.id ? <Badge variant="success">Current view</Badge> : null}
                      <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
                        <Link href={`/portal/census/${entry.id}`}>View table</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalContentFrame>
  );
}
