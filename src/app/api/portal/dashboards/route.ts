import { NextRequest, NextResponse } from "next/server";
import { createFirebaseDashboard } from "@/lib/firebase/dashboard-store";
import { getOptionalFirebaseUser, isInternalFirebaseRole } from "@/lib/firebase/auth";

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
      assetId?: string;
      family?: "collaboration" | "integration" | "employee_experience";
      title?: string;
      versionLabel?: string | null;
      description?: string;
      status?: "active" | "draft" | "archived";
      categoryLabels?: string[];
    };

    const assetId = body.assetId?.trim();
    const title = body.title?.trim();
    const description = body.description?.trim();

    if (!assetId) {
      return badRequest("Renderer asset ID is required.");
    }

    if (!title) {
      return badRequest("Dashboard title is required.");
    }

    if (!description) {
      return badRequest("Dashboard description is required.");
    }

    if (
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

    if (body.categoryLabels !== undefined && !Array.isArray(body.categoryLabels)) {
      return badRequest("Categories must be provided as an array.");
    }

    const dashboard = await createFirebaseDashboard({
      assetId,
      family: body.family,
      title,
      versionLabel: body.versionLabel,
      description,
      status: body.status,
      categoryLabels: body.categoryLabels,
    });

    return NextResponse.json({ dashboard });
  } catch (error) {
    console.error("Failed to create dashboard product", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create dashboard product.",
      },
      { status: 500 }
    );
  }
}
