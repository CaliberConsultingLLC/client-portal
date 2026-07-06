import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser, isInternalFirebaseRole } from "@/lib/firebase/auth";
import { createFirebaseReport } from "@/lib/firebase/report-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function assertInternalPortalAccess() {
  const actor = await getOptionalFirebaseUser();

  if (!actor) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!isInternalFirebaseRole(actor.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { actor };
}

export async function POST(request: NextRequest) {
  try {
    const access = await assertInternalPortalAccess();

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

    const dashboardId = body.dashboardId?.trim();
    const title = body.title?.trim();
    const description = body.description?.trim();

    if (!dashboardId) {
      return badRequest("Dashboard product is required.");
    }

    if (!title) {
      return badRequest("Report title is required.");
    }

    if (!description) {
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

    const report = await createFirebaseReport({
      dashboardId,
      perspectiveId: body.perspectiveId?.trim() || null,
      title,
      versionLabel: body.versionLabel,
      description,
      status: body.status,
      notes: body.notes,
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Failed to create report product", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create report product.",
      },
      { status: 500 }
    );
  }
}
