import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser, isInternalFirebaseRole } from "@/lib/firebase/auth";
import { getFirebaseDashboardInstanceById } from "@/lib/firebase/dashboard-store";
import {
  addPerspectiveInstanceToDashboardInstance,
  getPerspectiveLibraryItemById,
} from "@/lib/firebase/perspective-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function assertInternalPortalAccess(perspectiveId: string) {
  const actor = await getOptionalFirebaseUser();

  if (!actor) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!isInternalFirebaseRole(actor.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const perspective = await getPerspectiveLibraryItemById(perspectiveId);

  if (!perspective) {
    return { error: NextResponse.json({ error: "Perspective product not found" }, { status: 404 }) };
  }

  return { actor, perspective };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ perspectiveId: string }> }
) {
  try {
    const { perspectiveId } = await params;
    const access = await assertInternalPortalAccess(perspectiveId);

    if ("error" in access) {
      return access.error;
    }

    const body = (await request.json()) as {
      dashboardInstanceId?: string;
    };
    const dashboardInstanceId = body.dashboardInstanceId?.trim();

    if (!dashboardInstanceId) {
      return badRequest("Dashboard instance is required.");
    }

    const dashboardInstance = await getFirebaseDashboardInstanceById(dashboardInstanceId);

    if (!dashboardInstance) {
      return badRequest("Dashboard instance not found.");
    }

    if (dashboardInstance.dashboardId !== access.perspective.dashboardId) {
      return badRequest("This perspective product does not belong to that dashboard product.");
    }

    const instance = await addPerspectiveInstanceToDashboardInstance(
      perspectiveId,
      dashboardInstanceId
    );

    return NextResponse.json({ instance });
  } catch (error) {
    console.error("Failed to adopt perspective product", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to adopt perspective product.",
      },
      { status: 500 }
    );
  }
}
