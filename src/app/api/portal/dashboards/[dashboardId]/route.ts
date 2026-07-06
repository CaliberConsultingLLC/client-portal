import { NextRequest, NextResponse } from "next/server";
import {
  getFirebaseDashboardById,
  updateFirebaseDashboard,
} from "@/lib/firebase/dashboard-store";
import { getOptionalFirebaseUser, isInternalFirebaseRole } from "@/lib/firebase/auth";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function assertInternalPortalAccess(dashboardId: string) {
  const actor = await getOptionalFirebaseUser();

  if (!actor) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!isInternalFirebaseRole(actor.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const dashboard = await getFirebaseDashboardById(dashboardId);

  if (!dashboard) {
    return { error: NextResponse.json({ error: "Dashboard product not found" }, { status: 404 }) };
  }

  return { actor, dashboard };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { dashboardId } = await params;
    const access = await assertInternalPortalAccess(dashboardId);

    if ("error" in access) {
      return access.error;
    }

    const body = (await request.json()) as {
      assetId?: string;
      family?: "collaboration" | "integration" | "employee_experience";
      title?: string;
      versionLabel?: string | null;
      description?: string;
      status?: "active" | "draft" | "archived";
      categoryLabels?: string[];
    };

    if (
      body.family !== undefined &&
      body.family !== "collaboration" &&
      body.family !== "integration" &&
      body.family !== "employee_experience"
    ) {
      return badRequest("Invalid dashboard family.");
    }

    if (
      body.status !== undefined &&
      body.status !== "active" &&
      body.status !== "draft" &&
      body.status !== "archived"
    ) {
      return badRequest("Invalid dashboard status.");
    }

    if (body.assetId !== undefined && !body.assetId.trim()) {
      return badRequest("Renderer asset ID is required.");
    }

    if (body.title !== undefined && !body.title.trim()) {
      return badRequest("Dashboard title is required.");
    }

    if (body.description !== undefined && !body.description.trim()) {
      return badRequest("Dashboard description is required.");
    }

    if (body.categoryLabels !== undefined && !Array.isArray(body.categoryLabels)) {
      return badRequest("Categories must be provided as an array.");
    }

    const dashboard = await updateFirebaseDashboard({
      dashboardId,
      ...(body.assetId !== undefined ? { assetId: body.assetId } : {}),
      ...(body.family !== undefined ? { family: body.family } : {}),
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.versionLabel !== undefined ? { versionLabel: body.versionLabel } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.categoryLabels !== undefined ? { categoryLabels: body.categoryLabels } : {}),
    });

    return NextResponse.json({ dashboard });
  } catch (error) {
    console.error("Failed to update dashboard product", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update dashboard product.",
      },
      { status: 500 }
    );
  }
}
