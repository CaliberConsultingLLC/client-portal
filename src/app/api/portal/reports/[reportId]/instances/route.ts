import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser, isInternalFirebaseRole } from "@/lib/firebase/auth";
import { getFirebasePortalClientById } from "@/lib/firebase/portal-store";
import {
  createReportInstanceFromReport,
  getFirebaseReportById,
} from "@/lib/firebase/report-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function assertInternalPortalAccess(reportId: string) {
  const actor = await getOptionalFirebaseUser();

  if (!actor) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!isInternalFirebaseRole(actor.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const report = await getFirebaseReportById(reportId);

  if (!report) {
    return { error: NextResponse.json({ error: "Report product not found" }, { status: 404 }) };
  }

  return { actor, report };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;
    const access = await assertInternalPortalAccess(reportId);

    if ("error" in access) {
      return access.error;
    }

    const body = (await request.json()) as {
      clientId?: string;
      title?: string;
      status?: "active" | "draft";
      campaignLabel?: string | null;
      publishedOn?: string | null;
      href?: string | null;
      downloadHref?: string | null;
      notes?: string | null;
    };
    const clientId = body.clientId?.trim();

    if (!clientId) {
      return badRequest("Client workspace is required.");
    }

    const client = await getFirebasePortalClientById(clientId);

    if (!client) {
      return badRequest("Client workspace not found.");
    }

    if (body.status !== undefined && body.status !== "active" && body.status !== "draft") {
      return badRequest("Invalid report instance status.");
    }

    const instance = await createReportInstanceFromReport({
      reportId,
      clientId,
      title: body.title,
      status: body.status,
      campaignLabel: body.campaignLabel,
      publishedOn: body.publishedOn,
      href: body.href,
      downloadHref: body.downloadHref,
      notes: body.notes,
    });

    return NextResponse.json({ instance });
  } catch (error) {
    console.error("Failed to assign report product", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to assign report product.",
      },
      { status: 500 }
    );
  }
}
