import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser, isInternalFirebaseRole } from "@/lib/firebase/auth";
import {
  getPerspectiveLibraryItemById,
  updatePerspectiveLibraryItem,
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

export async function PATCH(
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
      dashboardId?: string;
      family?: "collaboration" | "integration" | "employee_experience";
      title?: string;
      versionLabel?: string | null;
      description?: string;
      rendererKey?: string;
      defaultCategoryLabels?: string[];
      notes?: string | null;
      status?: "active" | "draft";
    };

    if (
      body.family !== undefined &&
      body.family !== "collaboration" &&
      body.family !== "integration" &&
      body.family !== "employee_experience"
    ) {
      return badRequest("Invalid perspective family.");
    }

    if (body.dashboardId !== undefined && !body.dashboardId.trim()) {
      return badRequest("Dashboard product is required.");
    }

    if (body.title !== undefined && !body.title.trim()) {
      return badRequest("Perspective title is required.");
    }

    if (body.description !== undefined && !body.description.trim()) {
      return badRequest("Perspective description is required.");
    }

    if (body.rendererKey !== undefined && !body.rendererKey.trim()) {
      return badRequest("Renderer key is required.");
    }

    if (
      body.defaultCategoryLabels !== undefined &&
      !Array.isArray(body.defaultCategoryLabels)
    ) {
      return badRequest("Default categories must be provided as an array.");
    }

    if (body.status !== undefined && body.status !== "active" && body.status !== "draft") {
      return badRequest("Invalid perspective status.");
    }

    const perspective = await updatePerspectiveLibraryItem({
      perspectiveId,
      ...(body.dashboardId !== undefined ? { dashboardId: body.dashboardId.trim() } : {}),
      ...(body.family !== undefined ? { family: body.family } : {}),
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.versionLabel !== undefined ? { versionLabel: body.versionLabel } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.rendererKey !== undefined ? { rendererKey: body.rendererKey } : {}),
      ...(body.defaultCategoryLabels !== undefined
        ? { defaultCategoryLabels: body.defaultCategoryLabels }
        : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    });

    return NextResponse.json({ perspective });
  } catch (error) {
    console.error("Failed to update perspective product", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update perspective product.",
      },
      { status: 500 }
    );
  }
}
