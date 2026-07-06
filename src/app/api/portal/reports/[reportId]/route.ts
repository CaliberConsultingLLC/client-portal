import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser, isInternalFirebaseRole } from "@/lib/firebase/auth";
import { getFirebaseReportById, updateFirebaseReport } from "@/lib/firebase/report-store";

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

export async function PATCH(
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
      dashboardId?: string;
      perspectiveId?: string | null;
      title?: string;
      versionLabel?: string | null;
      description?: string;
      status?: "active" | "draft" | "archived";
      notes?: string | null;
    };

    if (body.dashboardId !== undefined && !body.dashboardId.trim()) {
      return badRequest("Dashboard product is required.");
    }

    if (body.title !== undefined && !body.title.trim()) {
      return badRequest("Report title is required.");
    }

    if (body.description !== undefined && !body.description.trim()) {
      return badRequest("Report description is required.");
    }

    if (
      body.status !== undefined &&
      body.status !== "active" &&
      body.status !== "draft" &&
      body.status !== "archived"
    ) {
      return badRequest("Invalid report status.");
    }

    const report = await updateFirebaseReport({
      reportId,
      ...(body.dashboardId !== undefined ? { dashboardId: body.dashboardId.trim() } : {}),
      ...(body.perspectiveId !== undefined
        ? { perspectiveId: body.perspectiveId?.trim() || null }
        : {}),
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.versionLabel !== undefined ? { versionLabel: body.versionLabel } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Failed to update report product", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update report product.",
      },
      { status: 500 }
    );
  }
}
