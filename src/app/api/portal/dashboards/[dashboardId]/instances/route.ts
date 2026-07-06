import { NextRequest, NextResponse } from "next/server";
import {
  createDashboardInstanceFromDashboard,
  getFirebaseDashboardById,
} from "@/lib/firebase/dashboard-store";
import { getOptionalFirebaseUser, isInternalFirebaseRole } from "@/lib/firebase/auth";
import { getFirebasePortalClientById } from "@/lib/firebase/portal-store";

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

export async function POST(
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
      clientId?: string;
      published?: boolean;
    };

    const clientId = body.clientId?.trim();

    if (!clientId) {
      return badRequest("Client workspace is required.");
    }

    const client = await getFirebasePortalClientById(clientId);

    if (!client) {
      return badRequest("Client workspace not found.");
    }

    const instance = await createDashboardInstanceFromDashboard({
      dashboardId,
      clientId,
      clientName: client.name,
      clientIsDemo: Boolean(client.isDemo),
      published: body.published ?? true,
    });

    return NextResponse.json({ instance });
  } catch (error) {
    console.error("Failed to assign dashboard product", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to assign dashboard product.",
      },
      { status: 500 }
    );
  }
}
