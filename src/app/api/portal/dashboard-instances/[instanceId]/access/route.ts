import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser, isInternalFirebaseRole } from "@/lib/firebase/auth";
import {
  getFirebaseDashboardInstanceById,
  syncFirebaseDashboardAccessGrants,
} from "@/lib/firebase/dashboard-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function assertInternalPortalAccess(instanceId: string) {
  const actor = await getOptionalFirebaseUser();

  if (!actor) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!isInternalFirebaseRole(actor.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const instance = await getFirebaseDashboardInstanceById(instanceId);

  if (!instance) {
    return { error: NextResponse.json({ error: "Dashboard instance not found" }, { status: 404 }) };
  }

  return { actor, instance };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const access = await assertInternalPortalAccess(instanceId);

    if ("error" in access) {
      return access.error;
    }

    const body = (await request.json()) as {
      grants?: Array<{
        id?: string;
        clientId: string;
        status: "active" | "draft" | "hidden";
        published: boolean;
      }>;
    };

    if (!Array.isArray(body.grants)) {
      return badRequest("Grant list is required.");
    }

    for (const grant of body.grants) {
      if (!grant.clientId?.trim()) {
        return badRequest("Each grant must include a client ID.");
      }

      if (grant.status !== "active" && grant.status !== "draft" && grant.status !== "hidden") {
        return badRequest("Invalid grant status.");
      }
    }

    const grants = await syncFirebaseDashboardAccessGrants({
      instanceId,
      grants: body.grants.map((grant) => ({
        id: grant.id,
        clientId: grant.clientId.trim(),
        status: grant.status,
        published: Boolean(grant.published),
      })),
    });

    return NextResponse.json({ grants });
  } catch (error) {
    console.error("Failed to update dashboard access grants", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update dashboard access grants.",
      },
      { status: 500 }
    );
  }
}
