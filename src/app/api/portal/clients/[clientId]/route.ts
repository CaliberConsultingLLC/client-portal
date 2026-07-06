import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser, isInternalFirebaseRole } from "@/lib/firebase/auth";
import {
  getFirebasePortalClientById,
  updateFirebasePortalClient,
  type FirebasePortalClientDoc,
} from "@/lib/firebase/portal-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function assertInternalPortalAccess(clientId: string) {
  const actor = await getOptionalFirebaseUser();

  if (!actor) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!isInternalFirebaseRole(actor.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const client = await getFirebasePortalClientById(clientId);

  if (!client) {
    return { error: NextResponse.json({ error: "Client not found" }, { status: 404 }) };
  }

  return { actor, client };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const access = await assertInternalPortalAccess(clientId);

    if ("error" in access) {
      return access.error;
    }

    const body = (await request.json()) as {
      name?: string;
      industry?: string | null;
      executivePocEmail?: string | null;
      hrPocEmail?: string | null;
      contractDate?: string | null;
      arr?: string | null;
      notes?: string | null;
      visibilityThreshold?: number | string | null;
      status?: FirebasePortalClientDoc["status"];
    };

    const nextName = body.name?.trim();
    if (body.name !== undefined && !nextName) {
      return badRequest("Organization name is required.");
    }

    if (
      body.status !== undefined &&
      body.status !== "active" &&
      body.status !== "inactive" &&
      body.status !== "draft"
    ) {
      return badRequest("Invalid status.");
    }

    const visibilityThreshold =
      body.visibilityThreshold === null ||
      body.visibilityThreshold === undefined ||
      body.visibilityThreshold === ""
        ? null
        : Number(body.visibilityThreshold);

    if (
      visibilityThreshold !== null &&
      (!Number.isFinite(visibilityThreshold) || visibilityThreshold < 0)
    ) {
      return badRequest("Visibility threshold must be a positive number.");
    }

    const client = await updateFirebasePortalClient({
      clientId,
      ...(body.name !== undefined ? { name: nextName } : {}),
      ...(body.industry !== undefined ? { industry: body.industry?.trim() || null } : {}),
      ...(body.executivePocEmail !== undefined
        ? { executivePocEmail: body.executivePocEmail?.trim() || null }
        : {}),
      ...(body.hrPocEmail !== undefined ? { hrPocEmail: body.hrPocEmail?.trim() || null } : {}),
      ...(body.contractDate !== undefined ? { contractDate: body.contractDate || null } : {}),
      ...(body.arr !== undefined ? { arr: body.arr?.trim() || null } : {}),
      ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.visibilityThreshold !== undefined ? { visibilityThreshold } : {}),
    });

    return NextResponse.json({ client });
  } catch (error) {
    console.error("Failed to update portal client", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update client.",
      },
      { status: 500 }
    );
  }
}
