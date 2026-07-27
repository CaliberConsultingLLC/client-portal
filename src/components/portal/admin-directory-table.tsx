import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AdminDirectoryMetric {
  label: string;
  value: string | number;
}

interface AdminDirectoryTableColumn {
  key: string;
  label: string;
  className?: string;
}

interface AdminDirectoryTableRow {
  id: string;
  cells: React.ReactNode[];
}

interface AdminDirectoryOverviewProps {
  title: string;
  description: string;
  metrics?: AdminDirectoryMetric[];
  actions?: React.ReactNode;
}

export function AdminDirectoryOverview({
  title,
  description,
  metrics = [],
  actions,
}: AdminDirectoryOverviewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold uppercase tracking-[0.24em] text-[#2B2B2B] sm:text-2xl">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#60727D]">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>

      {metrics.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <Card key={metric.label} className="rounded-[24px] border-[#D6DEE3] bg-white shadow-sm">
              <CardContent className="p-5">
                <p className="text-2xl font-extrabold text-[#2B2B2B]">{metric.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]">
                  {metric.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface AdminDirectorySectionProps {
  title: string;
  description: string;
  columns: AdminDirectoryTableColumn[];
  rows: AdminDirectoryTableRow[];
  emptyMessage: string;
}

export function AdminDirectorySection({
  title,
  description,
  columns,
  rows,
  emptyMessage,
}: AdminDirectorySectionProps) {
  return (
    <Card className="overflow-hidden rounded-[28px] border-[#D6DEE3] bg-white shadow-sm">
      <CardHeader className="border-b border-[#E5EBEF] bg-[#FAFCFD] px-6 py-5">
        <CardTitle className="text-base font-semibold uppercase tracking-[0.2em] text-[#2B2B2B] sm:text-lg">
          {title}
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed text-[#60727D]">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="px-6 py-12 text-sm text-[#60727D]">{emptyMessage}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#F5F8FA]">
                <tr>
                  {columns.map((column, index) => (
                    <th
                      key={column.key}
                      className={cn(
                        "whitespace-nowrap px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#60727D]",
                        index === 0 ? "text-left" : "text-center",
                        column.className
                      )}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBEF]">
                {rows.map((row) => (
                  <tr key={row.id} className="bg-white align-top">
                    {row.cells.map((cell, index) => (
                      <td
                        key={`${row.id}-${index}`}
                        className={cn(
                          "px-6 py-4 text-sm text-[#2B2B2B]",
                          index === 0 ? "text-left" : "text-center"
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
