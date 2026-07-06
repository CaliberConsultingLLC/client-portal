export interface PortalFlatReport {
  id: string;
  title: string;
  description: string;
  clientId: string;
  status: "available" | "draft";
  publishedOn?: string;
  campaignLabel?: string;
  href?: string;
  downloadHref?: string;
}

const flatReports: PortalFlatReport[] = [];

export function getPortalFlatReports(clientIds?: string[]) {
  if (!clientIds || clientIds.length === 0) {
    return flatReports;
  }

  return flatReports.filter((report) => clientIds.includes(report.clientId));
}
