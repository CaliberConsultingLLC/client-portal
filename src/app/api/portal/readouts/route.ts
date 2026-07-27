import { NextRequest, NextResponse } from "next/server";
import { getOptionalFirebaseUser, isInternalFirebaseRole } from "@/lib/firebase/auth";
import {
  canClientUserAccessReadout,
  createFirebaseReadout,
  getFirebaseReadouts,
  getFirebaseReadoutsByClientId,
} from "@/lib/firebase/readout-store";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  try {
    const actor = await getOptionalFirebaseUser();

    if (!actor) {
      return unauthorized();
    }

    const clientId = request.nextUrl.searchParams.get("clientId");

    if (clientId) {
      if (!isInternalFirebaseRole(actor.role) && !actor.clientIds.includes(clientId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const readouts = await getFirebaseReadoutsByClientId(clientId);
      const visibleReadouts = isInternalFirebaseRole(actor.role)
        ? readouts
        : readouts.filter((readout) => canClientUserAccessReadout(actor, readout));

      return NextResponse.json({ readouts: visibleReadouts });
    }

    const readouts = await getFirebaseReadouts();
    const visibleReadouts = isInternalFirebaseRole(actor.role)
      ? readouts
      : readouts.filter((readout) => canClientUserAccessReadout(actor, readout));

    return NextResponse.json({ readouts: visibleReadouts });
  } catch (error) {
    console.error("Failed to fetch readouts", error);
    return NextResponse.json({ error: "Unable to fetch readouts." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getOptionalFirebaseUser();

    if (!actor) {
      return unauthorized();
    }

    if (!isInternalFirebaseRole(actor.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      clientId?: string;
      campaignId?: string | null;
      surveyWaveLabel?: string | null;
      name?: string;
    };

    const clientId = body.clientId?.trim();
    const name = body.name?.trim();

    if (!clientId) {
      return badRequest("Client is required.");
    }

    if (!name) {
      return badRequest("Readout name is required.");
    }

    const readout = await createFirebaseReadout({
      clientId,
      campaignId: body.campaignId?.trim() || null,
      surveyWaveLabel: body.surveyWaveLabel?.trim() || null,
      name,
      createdBy: actor.email ?? actor.uid,
    });

    return NextResponse.json({ readout });
  } catch (error) {
    console.error("Failed to create readout", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create readout." },
      { status: 500 }
    );
  }
}
