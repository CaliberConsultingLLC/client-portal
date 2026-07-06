import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser, isInternalFirebaseRole } from "@/lib/firebase/auth";
import { createPerspectiveLibraryItem } from "@/lib/firebase/perspective-store";

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
      family?: "collaboration" | "integration" | "employee_experience";
      title?: string;
      versionLabel?: string | null;
      description?: string;
      rendererKey?: string;
      defaultCategoryLabels?: string[];
      notes?: string | null;
    };

    const dashboardId = body.dashboardId?.trim();
    const title = body.title?.trim();
    const description = body.description?.trim();
    const rendererKey = body.rendererKey?.trim();

    if (!dashboardId) {
      return badRequest("Dashboard product is required.");
    }

    if (!title) {
      return badRequest("Perspective title is required.");
    }

    if (!description) {
      return badRequest("Perspective description is required.");
    }

    if (!rendererKey) {
      return badRequest("Renderer key is required.");
    }

    if (
      body.family !== "collaboration" &&
      body.family !== "integration" &&
      body.family !== "employee_experience"
    ) {
      return badRequest("Invalid perspective family.");
    }

    if (
      body.defaultCategoryLabels !== undefined &&
      !Array.isArray(body.defaultCategoryLabels)
    ) {
      return badRequest("Default categories must be provided as an array.");
    }

    const perspective = await createPerspectiveLibraryItem({
      dashboardId,
      family: body.family,
      title,
      versionLabel: body.versionLabel,
      description,
      rendererKey,
      defaultCategoryLabels: body.defaultCategoryLabels,
      notes: body.notes,
    });

    return NextResponse.json({ perspective });
  } catch (error) {
    console.error("Failed to create perspective product", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create perspective product.",
      },
      { status: 500 }
    );
  }
}
