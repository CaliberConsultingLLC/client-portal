import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PortalContentFrame } from "@/components/portal/portal-content-frame";
import { CensusTableActions } from "@/components/portal/census-table-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isInternalFirebaseRole, requireFirebasePortalUser } from "@/lib/firebase/auth";
import { getCensusPreviewById } from "@/lib/firebase/census-store";
import { getAccessiblePortalClients } from "@/lib/firebase/portal-access";

interface CensusTablePageProps {
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

function normalizeColumnName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

const PRIORITY_COLUMN_ALIASES = [
  new Set(["eid", "id", "employee id", "employeeid", "employee number", "employee no"]),
  new Set(["first name", "firstname", "given name"]),
  new Set(["last name", "lastname", "surname", "family name"]),
  new Set(["email", "email address", "e mail", "work email"]),
  new Set(["phone", "phone number", "mobile", "mobile phone", "cell", "cell phone", "telephone"]),
];

function orderCensusColumns(columns: string[]) {
  const picked = new Set<string>();
  const priorityColumns = PRIORITY_COLUMN_ALIASES.flatMap((aliases) => {
    const match = columns.find((column) => aliases.has(normalizeColumnName(column)));

    if (!match || picked.has(match)) {
      return [];
    }

    picked.add(match);
    return [match];
  });

  return [...priorityColumns, ...columns.filter((column) => !picked.has(column))];
}

export default async function CensusTablePage({ params }: CensusTablePageProps) {
  const { uploadId } = await params;
  const user = await requireFirebasePortalUser();
  const canManageCensus = isInternalFirebaseRole(user.role) || user.role === "client_admin";

  if (!canManageCensus) {
    notFound();
  }

  const [clients, preview] = await Promise.all([
    getAccessiblePortalClients(user),
    getCensusPreviewById(uploadId),
  ]);
  const upload = preview.upload;

  if (!upload || !clients.some((client) => client.id === upload.clientId)) {
    notFound();
  }

  const displayColumns = orderCensusColumns(upload.columns);

  return (
    <PortalContentFrame>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#60727D]">
              Census Table
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2B2B2B]">
              {upload.surveyLabel}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">
              {upload.surveyId} · {upload.dashboardTitle ?? "Dashboard not linked"} · {formatDate(upload.updatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <CensusTableActions upload={upload} />
            <Button asChild variant="outline" className="rounded-full border-[#C9D2D8]">
              <Link href="/portal/census">
                <ArrowLeft className="h-4 w-4" />
                Back to census
              </Link>
            </Button>
          </div>
        </div>

        <Card className="rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#2B2B2B]">Census Rows</CardTitle>
            <CardDescription className="text-[#60727D]">
              Showing up to 200 rows from the processed census table. Employee ID column: {upload.employeeIdColumn}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border border-[#D6DEE3]">
              <div className="max-h-[720px] overflow-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="sticky top-0 bg-[#F5F8FA] text-xs uppercase tracking-[0.14em] text-[#60727D]">
                    <tr>
                      {displayColumns.map((column) => (
                        <th key={column} className="px-3 py-3 font-semibold">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EBEF]">
                    {preview.rows.map((row, index) => (
                      <tr key={`${row[upload.employeeIdColumn] ?? index}-${index}`}>
                        {displayColumns.map((column) => (
                          <td key={column} className="px-3 py-2 text-[#2B2B2B]">
                            {row[column] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalContentFrame>
  );
}
